import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.session import SessionMiddleware

from app.api.main import api_router
from app.core.config import settings


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(
        dsn="https://54775bcfd73bde71044ce49de6b97060@o4509034710237184.ingest.us.sentry.io/4509036081643520",
        enable_tracing=True,
        send_default_pii=True,
    )

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

# Add Session Middleware first (important for auth flows)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY.get_secret_value(),
    # Configure session cookie parameters as needed (e.g., https_only in production)
    # https_only=settings.ENVIRONMENT != "local", 
    # max_age=... # Optional: session expiration
)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
