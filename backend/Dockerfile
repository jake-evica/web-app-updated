FROM python:3.10 AS base

# Set working directory
WORKDIR /app

# Install necessary system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install pip, setuptools, and wheel
RUN pip install --upgrade pip setuptools wheel

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PATH="/app/.venv/bin:$PATH"

# Copy application files first
COPY ./app /app/app
COPY ./scripts /app/scripts
COPY ./alembic.ini /app/
COPY ./pyproject.toml ./uv.lock /app/
COPY .env /app/.env

# Now install the app in editable mode
RUN pip install -e .

# Install uvicorn to run FastAPI (install after app to avoid cache busting)
RUN pip install "uvicorn[standard]"

# Command to run the app using uvicorn
CMD ["uvicorn", "app.main:app", "--workers", "4", "--host", "0.0.0.0", "--port", "8000"]

