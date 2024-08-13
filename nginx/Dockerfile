# Create a production-ready image with Nginx
FROM nginx:latest

# Copy a custom Nginx configuration that handles Vue SPA routing
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY nginx.conf/ /etc/nginx/conf.d/