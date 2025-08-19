# Use Node.js 18
FROM node:18-alpine

# Set working directory to server
WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server source code
COPY server/ ./

# Build the TypeScript
RUN npm run build

# Expose port
EXPOSE 3003

# Start the server
CMD ["npm", "start"]