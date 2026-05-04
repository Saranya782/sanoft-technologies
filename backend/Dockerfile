# Base image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files and install only prod dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built app
COPY --from=builder /app/dist ./dist

# Expose port (Cloud Run sets PORT env var automatically, default 8080)
ENV PORT=8080
EXPOSE 8080

# Start command
CMD ["node", "dist/main"]
