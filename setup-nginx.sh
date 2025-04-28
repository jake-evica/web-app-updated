#!/bin/bash

# Exit on error
set -e

echo "=============================================="
echo "SETTING UP NGINX SSL CERTIFICATES AND AUTH"
echo "=============================================="

# Create necessary directories
echo "Creating Nginx directories..."
mkdir -p nginx/ssl
mkdir -p nginx/conf.d

# Create .htpasswd file for Adminer authentication
echo "Setting up Adminer authentication..."
if [ ! -f nginx/.htpasswd ]; then
    echo "Creating .htpasswd file..."
    htpasswd -c nginx/.htpasswd admin
else
    echo ".htpasswd file already exists."
fi

# Create Nginx configuration files if they don't exist
echo "Setting up Nginx configuration files..."

# Frontend configuration
cat > nginx/conf.d/default.conf << 'EOL'
server {
    listen 80;
    server_name app.${DOMAIN};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.${DOMAIN};

    ssl_certificate /etc/nginx/ssl/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/${DOMAIN}/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOL

# Backend API configuration
cat > nginx/conf.d/api.conf << 'EOL'
server {
    listen 80;
    server_name api.${DOMAIN};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.${DOMAIN};

    ssl_certificate /etc/nginx/ssl/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/${DOMAIN}/privkey.pem;

    # Backend API
    location / {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOL

# Adminer configuration
cat > nginx/conf.d/adminer.conf << 'EOL'
server {
    listen 80;
    server_name adminer.${DOMAIN};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name adminer.${DOMAIN};

    ssl_certificate /etc/nginx/ssl/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/${DOMAIN}/privkey.pem;

    # Basic auth for Adminer
    auth_basic "Adminer Access";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # Adminer
    location / {
        proxy_pass http://adminer:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOL

# Main Nginx configuration
cat > nginx/nginx.conf << 'EOL'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # Include server configurations
    include /etc/nginx/conf.d/*.conf;
}
EOL

echo "Nginx setup completed!"
echo "Next steps:"
echo "1. Make sure your domain DNS records are pointing to your server's IP"
echo "2. Run 'docker compose -f docker-compose.nginx.yml up -d' to start Nginx and Certbot"
echo "3. Check the logs with 'docker compose -f docker-compose.nginx.yml logs'" 