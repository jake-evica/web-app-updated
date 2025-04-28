#!/bin/bash
set -e

# Get environment variables
source .env

# Generate htpasswd file
htpasswd -bc nginx/.htpasswd $ADMINER_USERNAME $ADMINER_PASSWORD 