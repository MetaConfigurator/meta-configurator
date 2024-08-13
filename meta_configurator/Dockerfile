# Use the official Node.js image to build the Vue frontend
FROM node:21 AS builder

# Set the working directory in the container
WORKDIR /app

# Copy the source code into the container
COPY / /app

# Install dependencies and build the frontend
RUN npm ci
RUN npm run build

# Copy the built frontend files from the builder stage to the Nginx server
COPY --from=builder /app/dist /usr/share/nginx/html