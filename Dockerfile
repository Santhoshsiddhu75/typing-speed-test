# Use Node.js 18
FROM node:18-alpine

# Set working directory to server
WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy server source code
COPY server/ ./

# Build the TypeScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3003

# Start the server
CMD ["node", "dist/server.js"]