#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
npm install

# Build frontend
npm run build

# Create public directory
mkdir -p public

# Copy frontend build to public folder
cp -r dist/* public/

# Create uploads directory
mkdir -p uploads 