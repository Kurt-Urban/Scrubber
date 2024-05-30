FROM node:14-alpine

# Set the working directory inside the container to /app
WORKDIR /app
COPY package.json yarn.lock ./
RUN npm install -g yarn
RUN yarn install

# Copy the rest of the application code to the /app directory
COPY . .

# Build the TypeScript application
RUN yarn build

# Expose port 3000 to the outside world
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/index.js"]
