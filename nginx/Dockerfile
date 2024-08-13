# Create a production-ready image with Nginx
FROM nginx:latest

# Copy the built frontend files from the builder stage to the Nginx server
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom Nginx configuration that handles Vue SPA routing
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY nginx.conf/ /etc/nginx/conf.d/