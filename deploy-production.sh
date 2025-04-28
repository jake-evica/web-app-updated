#!/bin/bash

# Exit on error
set -e

# Main function
main() {
  # Set up SSL certificates
  echo "Setting up SSL certificates..."
  mkdir -p certbot/conf
  mkdir -p certbot/data
  mkdir -p nginx/ssl

  # Start nginx to handle ACME challenge
  docker compose up -d proxy

  # Get SSL certificates
  docker compose run --rm certbot

  # Restart proxy to use new certificates
  docker compose restart proxy

  # Deploy services
  echo "Deploying services..."
  export ENVIRONMENT=production

  # Start the database
  docker compose up -d db

  # Wait for database to be ready
  echo "Waiting for database..."
  sleep 10

  # Run database migrations
  docker compose up prestart

  # Deploy all services
  echo "Starting all services..."
  docker compose up -d
}

# Run main function
main

echo "Deployment completed successfully!"
