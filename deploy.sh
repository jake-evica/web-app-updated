#!/bin/bash

# Exit on error
set -e

# Function to display usage instructions
show_usage() {
    echo "=============================================="
    echo "ERROR: This script must be run on your remote server as root"
    echo "=============================================="
    echo "This deployment script is intended for server use only."
    echo "To deploy to your server, follow these steps:"
    echo
    echo "1. Copy your project files to your server:"
    echo "   rsync -avz --exclude 'node_modules' --exclude '__pycache__' --exclude 'venv' --exclude '.git' ./ root@\${DOMAIN}:/root/app/"
    echo
    echo "2. SSH into your server:"
    echo "   ssh root@\${DOMAIN}"
    echo
    echo "3. Run this script on your server:"
    echo "   cd /root/app"
    echo "   chmod +x deploy.sh"
    echo "   ./deploy.sh"
    echo "=============================================="
}

# Function to set up SSL certificates
setup_ssl() {
    echo "🔒 Setting up SSL certificates..."
    
    # Create required directories
    mkdir -p certbot/conf
    mkdir -p certbot/data
    mkdir -p nginx/ssl
    
    # Start nginx temporarily for SSL setup
    docker compose up -d proxy
    
    # Get SSL certificates
    docker compose run --rm certbot
    
    # Restart proxy to use new certificates
    docker compose restart proxy
}

# Function to set up authentication
setup_auth() {
    echo "🔑 Setting up authentication..."
    
    # Create .htpasswd file for Adminer if it doesn't exist
    if [ ! -f nginx/.htpasswd ]; then
        echo "Creating .htpasswd file for Adminer..."
        read -sp "Enter password for Adminer: " ADMINER_PASSWORD
        echo
        echo "admin:$(openssl passwd -apr1 $ADMINER_PASSWORD)" > nginx/.htpasswd
    fi
}

# Function to deploy services
deploy_services() {
    echo "🚀 Deploying services..."
    
    # Switch to production environment
    ./scripts/switch-env.sh prod
    
    # Start the database first
    echo "📊 Starting database..."
    docker compose up -d db
    
    # Wait for database to be healthy
    echo "⏳ Waiting for database to be ready..."
    until docker compose ps -q db &>/dev/null && docker compose exec db pg_isready -U postgres; do
        echo "Database not ready yet... waiting"
        sleep 5
    done
    
    # Run database migrations
    echo "🔄 Running database migrations..."
    docker compose up prestart
    
    # Deploy all services
    echo "🚀 Starting all services..."
    docker compose --profile production up -d
}

# Function to verify deployment
verify_deployment() {
    echo "✅ Verifying deployment..."
    
    # Check container status
    docker compose ps
    
    # Check if any containers are unhealthy
    if docker compose ps | grep -q "unhealthy"; then
        echo "⚠️ Warning: Some containers are unhealthy!"
        echo "Check the logs with: docker compose logs"
        exit 1
    fi
}

# Main deployment process
main() {
    # Check if running as root
    if [ "$(whoami)" != "root" ]; then
        show_usage
        exit 1
    fi

    echo "=============================================="
    echo "🚀 STARTING PRODUCTION DEPLOYMENT"
    echo "=============================================="

    # Load environment variables
    export DOMAIN=${DOMAIN:-gosystemslab.com}
    export EMAIL=${EMAIL:-jake@gosystemslab.com}
    export FRONTEND_HOST=${FRONTEND_HOST:-https://app.${DOMAIN}}
    export ENVIRONMENT=production
    export TAG=$(date +%Y%m%d%H%M%S)

    # Execute deployment steps
    setup_auth
    setup_ssl
    deploy_services
    verify_deployment

    echo "=============================================="
    echo "✨ Deployment completed successfully!"
    echo "=============================================="
    echo
    echo "🌐 Your application is now available at:"
    echo "Frontend: https://app.${DOMAIN}"
    echo "Backend API: https://api.${DOMAIN}"
    echo "API Documentation: https://api.${DOMAIN}/docs"
    echo "Adminer: https://adminer.${DOMAIN}"
    echo 
    echo "📝 Useful commands:"
    echo "- View logs: docker compose logs [service]"
    echo "- Check status: docker compose ps"
    echo "- Restart services: docker compose restart"
    echo "- Stop all: docker compose down"
}

# Execute main function
main 