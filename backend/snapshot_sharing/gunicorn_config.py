import os

# Basic configuration
bind = "0.0.0.0:5000"
workers = 4
timeout = 120

# Check environment variable to determine if we should use SSL
use_ssl = os.environ.get('FLASK_ENABLE_SSL', 'true').lower() == 'true'

# Only add SSL configuration if explicitly enabled
if use_ssl:
    # SSL settings - only applied when FLASK_ENABLE_SSL is true
    certfile = "/app/local.crt"  # Path to the SSL certificate
    keyfile = "/app/local.key"   # Path to the SSL private key
    
    print("INFO: Gunicorn running with SSL enabled")
else:
    print("INFO: Gunicorn running without SSL (relying on proxy for SSL)")

# Access log format
accesslog = '-'
errorlog = '-'
loglevel = 'info'