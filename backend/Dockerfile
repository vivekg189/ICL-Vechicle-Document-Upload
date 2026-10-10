# ==============================================================================
# VehicleVault Backend — Production Dockerfile
# Base: Python 3.11 slim
# ==============================================================================

FROM python:3.11-slim

# Set environment variables for Python in container
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    RUNNING_IN_DOCKER=true \
    PORT=5000 \
    FLASK_ENV=production

# Set working directory
WORKDIR /app

# Install system dependencies if needed and copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire Flask application into the container
COPY . .

# Create /app/uploads directory inside the container
RUN mkdir -p /app/uploads

# Expose port 5000
EXPOSE 5000

# Production-oriented command using Gunicorn WSGI server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:app"]
