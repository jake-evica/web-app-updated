# Development Guide

This guide explains how to set up your development environment.

## Prerequisites

1. Docker and Docker Compose installed on your machine
2. Git installed on your machine

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/your-project.git
   cd your-project
   ```

2. Create a `.env` file with your development settings:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your development settings:
   ```
   ENVIRONMENT=local
   DOMAIN=localhost
   FRONTEND_HOST=http://localhost:5174
   ```

4. Start the development environment:
   ```bash
   ./deploy-local.sh
   ```

Your application will be available at:
- Frontend: http://localhost:5174
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Adminer (DB Admin): http://localhost:8081

## Development Workflow

1. Make changes to the code
2. The frontend and backend services will automatically reload when you make changes
3. Check the logs for any errors:
   ```bash
   docker compose logs -f
   ```

## Local Development Features

- Hot reload for both frontend and backend
- Local database with Adminer for database management
- API documentation available at /docs
- Development-specific settings and configurations

## Troubleshooting

If you encounter issues:

1. Check if all services are running:
   ```bash
   docker compose ps
   ```

2. View service logs:
   ```bash
   docker compose logs [service]
   ```

3. Restart services:
   ```bash
   docker compose restart
   ```

4. Rebuild services:
   ```bash
   docker compose up -d --build
   ```

## Development Commands

- Start all services: `docker compose up -d`
- Stop all services: `docker compose down`
- View logs: `docker compose logs -f`
- Rebuild a service: `docker compose up -d --build [service]`
- Access database: `docker compose exec db psql -U postgres`
- Run migrations: `docker compose exec backend alembic upgrade head`