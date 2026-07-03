FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV HOME=/home/format-processing

WORKDIR /app

# Create a non-root user.
RUN adduser --disabled-password --home /home/format-processing format-processing

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

USER format-processing

EXPOSE 5000

CMD ["gunicorn", "-c", "gunicorn_config.py", "wsgi:application"]
