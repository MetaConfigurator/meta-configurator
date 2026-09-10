FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV HOME=/home/relay

WORKDIR /app

# Create a non-root user.
RUN adduser --disabled-password --home /home/relay relay

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py wsgi.py ./

# config.yaml is NOT baked into the image — mount it at runtime:
#   docker run -v ./config.yaml:/app/config.yaml:ro ...
# The CONFIG_PATH env var can override the default location.

USER relay

EXPOSE 8080

# Single gevent worker ensures the in-memory rate limiter and token tracker
# are consistent (no per-worker state divergence).
# Generous timeout to accommodate long LLM responses; cap upstream wait time
# via request_timeout in config.yaml.
#
# The wsgi module imports app.py, loads config.yaml via load_config(), and
# exposes the Flask app as `application` for Gunicorn to serve.
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8080", \
     "--worker-class", "gevent", \
     "--workers", "1", \
     "--timeout", "300", \
     "--keep-alive", "5", \
     "wsgi:application"]
