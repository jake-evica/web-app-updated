# app/core/db.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from app.core.config import settings  # Assuming settings is where SQLAlchemy URI is configured

# Ensure SQLALCHEMY_DATABASE_URI is a string by calling str()
SQLALCHEMY_DATABASE_URI = str(settings.SQLALCHEMY_DATABASE_URI)

# Create the engine instance
engine = create_engine(SQLALCHEMY_DATABASE_URI, pool_size=10, max_overflow=20)

# Create a sessionmaker, this will generate the session when we need it
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a base class for model definitions
Base = declarative_base()

# Dependency to get the database session
def get_db():
    db = SessionLocal()  # Creating a new session
    try:
        yield db
    finally:
        db.close()  # Make sure to close the session after use

