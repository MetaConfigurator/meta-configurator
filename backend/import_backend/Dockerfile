FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV HOME=/home/import-backend

WORKDIR /app

# Create a non-root user.
RUN adduser --disabled-password --home /home/import-backend import-backend

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

USER import-backend

EXPOSE 5000

CMD ["gunicorn", "-c", "gunicorn_config.py", "wsgi:application"]
