# Use the official Python image
FROM python:3.9-slim

# Set environment variable to prevent buffering of output
ENV PYTHONUNBUFFERED 1

# Create and set working directory
WORKDIR /app

# Copy requirements.txt into the container
COPY requirements.txt /app/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . /app/

# Expose the port the app runs on
EXPOSE 5000

# Run the application with Gunicorn
CMD ["gunicorn", "-c", "gunicorn_config.py", "app:app"]