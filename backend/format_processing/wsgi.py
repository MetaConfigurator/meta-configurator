"""WSGI entry point: Gunicorn serves the Flask app as "wsgi:application"."""

from app import app as application  # noqa: F401
