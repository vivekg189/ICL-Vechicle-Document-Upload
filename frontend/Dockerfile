# ==============================================================================
# VehicleVault Frontend — Production Dockerfile
# Stage 1: Build production React assets with Node.js
# Stage 2: Serve with Nginx & reverse-proxy /api to Flask backend
# ==============================================================================

# --- Stage 1: Build React App ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build-time API configuration (defaults to relative '/api' for Nginx reverse-proxy)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built production assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx template with reverse proxy configuration
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default backend URL (connecting to containerized Flask backend via host.docker.internal:5000 or docker network)
ENV BACKEND_URL=http://host.docker.internal:5000

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
