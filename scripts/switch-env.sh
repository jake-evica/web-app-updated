#!/bin/bash

# Exit on error
set -e

# Check if environment argument is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/switch-env.sh [local|staging|prod]"
    exit 1
fi

ENV=$1

# Validate environment
if [ "$ENV" != "local" ] && [ "$ENV" != "staging" ] && [ "$ENV" != "prod" ]; then
    echo "Invalid environment. Use: local, staging, or prod"
    exit 1
fi

echo "🔄 Switching to $ENV environment..."

# Stop current containers
echo "🛑 Stopping current containers..."
docker compose down

# Backup current .env if it exists
if [ -f .env ]; then
    echo "💾 Backing up current .env..."
    mv .env .env.backup
fi

# Copy environment-specific files
echo "📁 Copying environment-specific configurations..."
if [ "$ENV" = "prod" ]; then
    cp config/prod/.env .env
    cp docker-compose.prod.yml docker-compose.override.yml
elif [ "$ENV" = "local" ]; then
    cp config/local/.env .env
    # Remove any existing override file for local development
    rm -f docker-compose.override.yml
else
    cp config/$ENV/.env .env
    cp config/$ENV/docker-compose.override.yml docker-compose.override.yml
fi

# Set up environment-specific variables
if [ "$ENV" = "prod" ]; then
    export ENVIRONMENT=production
    export TAG=$(date +%Y%m%d%H%M%S)
else
    export ENVIRONMENT=$ENV
    export TAG=latest
fi

echo "✅ Environment switched to $ENV"
echo "Run 'docker compose up -d' to start services with new configuration" 