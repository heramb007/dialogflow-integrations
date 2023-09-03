# Use the official Node.js 18 image.
   # https://hub.docker.com/_/node
   FROM node:18
   ENV PORT 8080
   ENV HOST 0.0.0.0
   EXPOSE 8080
   # Create and change to the app directory.
   WORKDIR /usr/src/app

   # Set this environmental variable to the integration you want to use
   ENV INTEGRATION=/cx/slack

   # Copy application dependency manifests to the container image.
   # A wildcard is used to ensure both package.json AND package-lock.json are copied.
   # Copying this separately prevents re-running npm install on every code change.
   COPY ${INTEGRATION}/package*.json ./

   # Install production dependencies.
   RUN npm install -g npm@10.0.0

   # Copy local code to the container image.
   COPY . .

   # Run the web service on container startup.
   WORKDIR ${INTEGRATION}
   CMD [ "npm", "start" ]
