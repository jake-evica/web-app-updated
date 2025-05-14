from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.models import TokenPayload, User

# OAuth2 password bearer token setup
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)

# Dependency to get the database session
def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

# Annotated types for easy dependency injection
SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]

# Get the current user based on the JWT token
def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        # Decode JWT token and extract user data
        payload = jwt.decode(
            token, settings.SECRET_KEY.get_secret_value(), algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    # Fetch user from the database using the decoded user ID (sub)
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Ensure the user is active
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return user

# Annotated type for the current user, which is a dependency
CurrentUser = Annotated[User, Depends(get_current_user)]

# Function to get the current active user (this is new)
def get_current_active_user(session: SessionDep, token: TokenDep) -> User:
    user = get_current_user(session, token)  # Reuse `get_current_user` logic
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

# Function to check if the current user is a superuser
def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user
