import uuid
from typing import Any
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import Item, ItemCreate, User, UserCreate, UserUpdate
from app.utils import encrypt_token, decrypt_token


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


def update_user_amazon_tokens(
    *,
    session: Session,
    user: User,
    access_token: str,
    refresh_token: str | None,
    expires_in: int # Seconds until expiry
) -> User:
    """Encrypts and stores Amazon Ads tokens for a user."""
    user.amazon_ads_encrypted_access_token = encrypt_token(access_token)
    if refresh_token:
        user.amazon_ads_encrypted_refresh_token = encrypt_token(refresh_token)
    else:
        user.amazon_ads_encrypted_refresh_token = None # Clear if no new refresh token provided

    # Calculate expiry time
    now = datetime.now(timezone.utc)
    user.amazon_ads_token_expiry = now + timedelta(seconds=expires_in)

    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_valid_amazon_access_token(*, session: Session, user: User) -> str | None:
    """Retrieves a valid Amazon access token for the user, refreshing if necessary.""" 
    if not user.amazon_ads_encrypted_access_token or not user.amazon_ads_token_expiry:
        # No token stored
        return None

    now = datetime.now(timezone.utc)
    # Check if token is expired (or nearing expiry, e.g., within 5 minutes)
    if user.amazon_ads_token_expiry <= (now + timedelta(minutes=5)):
        # Token is expired or nearing expiry, try to refresh
        if not user.amazon_ads_encrypted_refresh_token:
            # No refresh token available
            return None
        
        refresh_token = decrypt_token(user.amazon_ads_encrypted_refresh_token)
        if not refresh_token:
            # Failed to decrypt refresh token
            return None

        # --- Refresh Token Logic (Requires httpx, settings) ---
        # This part needs access to httpx, AMAZON_TOKEN_URL, client_id, client_secret
        # It's usually better to handle this in a dedicated service or within the API route context
        # where these dependencies are available, rather than directly in CRUD.
        # Placeholder: Assume a function `refresh_amazon_token` exists elsewhere.
        # new_token_data = refresh_amazon_token(refresh_token)
        # if new_token_data:
        #     # Update the user's tokens with the new data
        #     user = update_user_amazon_tokens(
        #         session=session,
        #         user=user,
        #         access_token=new_token_data['access_token'],
        #         refresh_token=new_token_data.get('refresh_token'), # Use new refresh token if provided
        #         expires_in=new_token_data['expires_in']
        #     )
        #     # Return the new, decrypted access token
        #     return decrypt_token(user.amazon_ads_encrypted_access_token)
        # else:
        #     # Refresh failed
        #     return None 
        # -------------------------------------------------------
        # For now, just indicate refresh is needed but not implemented here
        print("Token needs refresh, but refresh logic is not implemented in CRUD.")
        return None # Or raise an exception
    
    else:
        # Token is still valid, decrypt and return it
        return decrypt_token(user.amazon_ads_encrypted_access_token)
