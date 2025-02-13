# Use the official Python image
FROM python:3.9-slim

# Set environment variable to prevent buffering of output
ENV PYTHONUNBUFFERED 1

# Install OpenSSL for generating certificates
RUN apt-get update && apt-get install -y openssl && apt-get clean

# Create and set working directory
WORKDIR /app

# Copy requirements.txt into the container
COPY requirements.txt /app/
# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Generate a self-signed certificate
RUN openssl req -x509 -nodes -newkey rsa:2048 -keyout /app/local.key -out /app/local.crt -days 365 -subj "/C=DE/ST=Baden-Württemberg/L=Stuttgart/O=University of Stuttgart/OU=Dev/CN=localhost"

# Copy the rest of the application code into the container
COPY . /app/

# Expose the port the app runs on
EXPOSE 5000

# Run the application with Gunicorn
CMD ["gunicorn", "-c", "gunicorn_config.py", "app:app"]