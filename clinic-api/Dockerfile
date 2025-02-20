FROM node:20-slim

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install both production and dev dependencies for TypeScript compilation
RUN npm ci

# Copy the entire project
COPY . .

# Compile TypeScript
RUN npm run build

# Remove dev dependencies to keep image lean
RUN npm prune --production

# Expose the port Cloud Run expects
EXPOSE 3000

# Use the start script that runs compiled JS
CMD [ "npm", "start" ]