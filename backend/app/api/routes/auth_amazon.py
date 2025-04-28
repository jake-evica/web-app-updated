import secrets
import httpx
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from starlette.responses import RedirectResponse
from urllib.parse import urlencode
import logging

from app.core.config import settings
# --- Use DB session and User model --- 
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.models import User # Assuming you have a User model
from app.api.deps import get_current_active_user # Assuming this dependency exists
from app.crud import update_user_amazon_tokens # Import the new CRUD function
# --- End Imports ---

# Setup logger
logger = logging.getLogger(__name__)

# Define Amazon OAuth 2.0 endpoints
AMAZON_AUTH_URL = "https://www.amazon.com/ap/oa"
AMAZON_TOKEN_URL = "https://api.amazon.com/auth/o2/token"

# Placeholder for the required scope. Adjust this based on the specific permissions your app needs.
# See: https://developer-docs.amazon.com/amazon-ads/docs/login-with-amazon/lwa-guide#scopes
REQUIRED_SCOPE = "profile advertising::campaign_management" # Example scope

router = APIRouter()

@router.get("/login", response_class=RedirectResponse, status_code=302)
async def amazon_login(request: Request):
    """
    Redirects the user to the Amazon Login page to grant permissions.
    """
    if not settings.AMAZON_CLIENT_ID or not settings.AMAZON_REDIRECT_URI:
        logger.error("Amazon Client ID or Redirect URI not configured.")
        raise HTTPException(status_code=500, detail="Server configuration error for Amazon Login.")

    # Generate a unique state parameter for CSRF protection
    state = secrets.token_urlsafe(16)
    request.session["amazon_oauth_state"] = state # Store state in session

    params = {
        "client_id": settings.AMAZON_CLIENT_ID,
        "scope": REQUIRED_SCOPE,
        "response_type": "code",
        "redirect_uri": settings.AMAZON_REDIRECT_URI,
        "state": state,
        # Optional: Add 'access_type=offline' if you need a refresh_token
        # See: https://developer-docs.amazon.com/amazon-ads/docs/login-with-amazon/lwa-guide#token-request
        # "access_type": "offline", # Uncomment if refresh token is needed
    }
    login_url = f"{AMAZON_AUTH_URL}?{urlencode(params)}"
    logger.info(f"Redirecting user to Amazon login: {login_url.split('?')[0]}...") # Log URL base for security
    return RedirectResponse(url=login_url)

@router.get("/callback")
async def amazon_callback(
    request: Request,
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    error_description: str | None = Query(None),
    # --- Use DB session and get current user --- 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user) # Get the logged-in user
):
    """
    Handles the callback from Amazon after user authorization.
    Exchanges the authorization code for access and refresh tokens, 
    and stores them securely for the current user.
    """
    if error:
        logger.error(f"Amazon OAuth error: {error} - {error_description}")
        error_redirect_url = f"{settings.FRONTEND_HOST}/link-amazon/error?message={error_description or error}"
        return RedirectResponse(url=error_redirect_url)

    stored_state = request.session.get("amazon_oauth_state")
    if not stored_state or stored_state != state:
        logger.warning("Invalid state parameter received from Amazon callback.")
        error_redirect_url = f"{settings.FRONTEND_HOST}/link-amazon/error?message=Invalid state parameter"
        return RedirectResponse(url=error_redirect_url)

    request.session.pop("amazon_oauth_state", None)

    if not code:
        logger.error("No authorization code received from Amazon callback.")
        error_redirect_url = f"{settings.FRONTEND_HOST}/link-amazon/error?message=Authorization code missing"
        return RedirectResponse(url=error_redirect_url)
    
    if not current_user:
         # This shouldn't happen if get_current_active_user requires authentication
         logger.error("Could not identify current user during Amazon OAuth callback.")
         raise HTTPException(status_code=401, detail="User not authenticated.")

    # Exchange code for tokens
    token_payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.AMAZON_REDIRECT_URI,
        "client_id": settings.AMAZON_CLIENT_ID,
        "client_secret": settings.AMAZON_CLIENT_SECRET.get_secret_value() if settings.AMAZON_CLIENT_SECRET else None,
    }

    if not token_payload["client_secret"]:
         logger.error("Amazon Client Secret not configured for token exchange.")
         raise HTTPException(status_code=500, detail="Server configuration error for Amazon Login.")

    async with httpx.AsyncClient() as client:
        try:
            token_response = await client.post(AMAZON_TOKEN_URL, data=token_payload)
            token_response.raise_for_status() 
            token_data = token_response.json()

            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token") 
            expires_in = token_data.get("expires_in") 
            token_type = token_data.get("token_type") 

            if not access_token or not expires_in:
                 logger.error("Access token or expires_in not found in Amazon token response.")
                 raise HTTPException(status_code=500, detail="Failed to retrieve valid token data from Amazon.")

            logger.info(f"Successfully obtained Amazon token data for user {current_user.email}. Refresh token {'present' if refresh_token else 'not present'}.")

            # --- Store tokens securely using CRUD function --- 
            update_user_amazon_tokens(
                session=db,
                user=current_user,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=expires_in
            )
            logger.info(f"Successfully stored encrypted Amazon tokens for user {current_user.email}.")
            # -------------------------------------------------
            
            # --- Redirect to a success page --- 
            # Frontend should probably indicate successful linking
            success_redirect_url = f"{settings.FRONTEND_HOST}/link-amazon/success" 
            return RedirectResponse(url=success_redirect_url)
            # ------------------------------------

        except httpx.RequestError as exc:
            logger.error(f"HTTP request error during Amazon token exchange: {exc}")
            error_redirect_url = f"{settings.FRONTEND_HOST}/link-amazon/error?message=Network error contacting Amazon"
            return RedirectResponse(url=error_redirect_url)
        except httpx.HTTPStatusError as exc:
            logger.error(f"HTTP status error during Amazon token exchange: {exc.response.status_code} - {exc.response.text}")
            error_detail = f"Amazon returned an error ({exc.response.status_code})."
            try:
                error_json = exc.response.json()
                error_detail += f" Details: {error_json.get('error_description') or error_json.get('error') or exc.response.text[:100]}"
            except Exception:
                error_detail += f" Raw Response: {exc.response.text[:100]}"
            error_redirect_url = f"{settings.FRONTEND_HOST}/link-amazon/error?message={error_detail}"
            return RedirectResponse(url=error_redirect_url)
        except Exception as exc:
            logger.exception(f"An unexpected error occurred during Amazon token callback for user {current_user.email}.")
            error_redirect_url = f"{settings.FRONTEND_HOST}/link-amazon/error?message=Internal server error"
            return RedirectResponse(url=error_redirect_url)

# Removed placeholder token storage/retrieval functions from here, they are in crud.py 