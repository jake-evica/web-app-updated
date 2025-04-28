#!/bin/bash

# Exit on error
set -e

# Check if running with sudo/root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

echo "🚀 Starting production deployment..."

# 1. Switch to production environment
./scripts/switch-env.sh prod

# 2. Pull latest images
echo "📥 Pulling latest Docker images..."
docker compose pull

# 3. Create required directories for SSL
echo "📁 Setting up SSL directories..."
mkdir -p certbot/conf
mkdir -p certbot/data

# 4. Start nginx without SSL first
echo "🌐 Starting nginx for initial SSL setup..."
docker compose up -d proxy

# 5. Get SSL certificates
echo "🔒 Obtaining SSL certificates..."
docker compose run --rm certbot

# 6. Restart proxy to use new certificates
echo "🔄 Restarting proxy with SSL..."
docker compose restart proxy

# 7. Start all services
echo "🚀 Starting all services..."
docker compose --profile production up -d

# 8. Run database migrations
echo "📊 Running database migrations..."
docker compose exec backend alembic upgrade head

# 9. Verify services
echo "✅ Verifying services..."
docker compose ps

echo "🎉 Deployment complete! Please verify the following URLs are accessible:"
echo "- Frontend: https://app.gosystemslab.com"
echo "- API: https://api.gosystemslab.com"
echo "- Adminer: https://adminer.gosystemslab.com"

# Check if services are healthy
echo "🏥 Checking service health..."
if docker compose ps | grep -q "unhealthy"; then
    echo "⚠️ Warning: Some services are not healthy. Please check the logs:"
    echo "docker compose logs"
    exit 1
fi

echo "✨ All services are running!" 