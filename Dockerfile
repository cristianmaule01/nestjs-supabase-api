# --- STAGE 1: Build Stage ---
# CRITICAL FIX: Switched from slim Alpine to full Node image to ensure PostgreSQL driver (pg) compatibility
FROM node:20 AS builder

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies (including development dependencies for NestJS build)
RUN npm install

# Copy all source code
COPY . .

# Compile the TypeScript application into production JavaScript
RUN npm run build 

# --- STAGE 2: Production/Runner Stage ---
# Use the stable, Debian-based Node image for the final production deployment
FROM node:20 AS runner

# Set working directory
WORKDIR /usr/src/app

# Only copy package.json and install *production* dependencies
COPY package.json ./
RUN npm install

# Copy the built application code from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Set the port Cloud Run expects (default is 8080)
ENV PORT 8080 
EXPOSE 8080

# Define the command to start the compiled application
CMD [ "node", "dist/main" ]