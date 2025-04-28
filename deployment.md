# Deployment Guide

This guide explains how to deploy the application to a production server with Nginx as a reverse proxy.

## Prerequisites

1. A VPS or server running Ubuntu 20.04+ or similar Linux distribution
2. Root access to the server
3. A domain name pointing to your server
4. Docker and Docker Compose installed on your server

## Deployment Steps

### 1. Prepare Your Environment Files

Before deployment, make sure your `.env` file contains the correct production settings:

```
# Domain
DOMAIN=yourdomain.com

# Used by the backend to generate links in emails to the frontend
FRONTEND_HOST=https://app.yourdomain.com

# Environment: local, staging, production
ENVIRONMENT=production

# Project Name
PROJECT_NAME="Your Project Name"
STACK_NAME=your-project-name

# Backend
BACKEND_CORS_ORIGINS="https://app.yourdomain.com,https://api.yourdomain.com"
SECRET_KEY=your_secure_random_string
FIRST_SUPERUSER=admin@yourdomain.com
FIRST_SUPERUSER_PASSWORD=secure_admin_password

# Other configurations...
```

### 2. Sync Files to Your Server

Use rsync to copy your project files to the server:

```bash
rsync -avz --exclude 'node_modules' --exclude '__pycache__' --exclude 'venv' --exclude '.git' ./ root@yourdomain.com:/root/app/
```

### 3. SSH to Your Server

```bash
ssh root@yourdomain.com
```

### 4. Deploy the Application

Navigate to your application directory and run the deployment script:

```bash
cd /root/app
chmod +x deploy.sh
./deploy.sh
```

The deployment script will:
1. Set up Nginx as a reverse proxy with automatic HTTPS
2. Create necessary Docker networks
3. Start the database first and ensure it's ready
4. Run database migrations with the prestart service
5. Deploy the backend API service with FastAPI
6. Deploy the frontend application

### 5. Verify Deployment

After the deployment completes, your application should be available at:

- Frontend: https://app.yourdomain.com
- Backend API: https://api.yourdomain.com
- API Documentation: https://api.yourdomain.com/docs
- Adminer (Database Admin): https://adminer.yourdomain.com

## Troubleshooting

If you encounter issues with the deployment:

1. Check Docker container status:
   ```bash
   docker compose ps
   ```

2. View container logs:
   ```bash
   docker compose logs backend
   docker compose logs frontend
   docker compose logs db
   ```

3. Verify Nginx is properly configured:
   ```bash
   docker compose -f docker-compose.nginx.yml logs
   ```

4. Check if services are reachable:
   ```bash
   curl -I http://localhost:8000/api/v1/utils/health-check/
   ```

5. Inspect Docker networks:
   ```bash
   docker network inspect app-network
   ```

6. If needed, restart the deployment process:
   ```bash
   cd /root/app
   ./deploy.sh
   ```

## Redeployment

For future updates, follow the same steps to rsync your updated code to the server and run the deployment script again.

## Server Maintenance

For server maintenance:

- To restart all services: `docker compose restart`
- To rebuild and update services: `./deploy.sh`
- To stop all services: `docker compose down`
- To view logs in real-time: `docker compose logs -f`
- To check disk usage: `docker system df`
- To clean up unused resources: `docker system prune -a`
