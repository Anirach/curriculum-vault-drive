FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine

# Create nginx user and directories with proper permissions
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx && \
    mkdir -p /var/cache/nginx /var/log/nginx /tmp && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /tmp && \
    chmod -R 755 /var/cache/nginx /var/log/nginx /tmp

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Create and set permissions for required directories
RUN mkdir -p /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Switch to nginx user
USER nginx

# Expose port 8080 (non-privileged port)
EXPOSE 8000

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]