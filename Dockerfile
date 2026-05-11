###################################################
# Stage: base
###################################################
FROM node:22 AS base
WORKDIR /usr/local/app
RUN chown node:node /usr/local/app
USER node

################## CLIENT STAGES ##################

###################################################
# Stage: client-base
###################################################
FROM base AS client-base
COPY --chown=node:node client/package.json client/package-lock.json ./
RUN npm install
COPY --chown=node:node client/.eslintrc.cjs client/index.html client/vite.config.js ./
COPY --chown=node:node client/public ./public
COPY --chown=node:node client/src ./src

###################################################
# Stage: client-dev
###################################################
FROM client-base AS client-dev
CMD ["npm", "run", "dev"]

###################################################
# Stage: client-build
###################################################
FROM client-base AS client-build
RUN npm run build


###################################################
################  BACKEND STAGES  #################
###################################################

###################################################
# Stage: backend-dev
###################################################
FROM base AS backend-dev
COPY --chown=node:node backend/package.json backend/package-lock.json ./
RUN npm install
COPY --chown=node:node backend/spec ./spec
COPY --chown=node:node backend/src ./src
CMD ["npm", "run", "dev"]

###################################################
# Stage: test
###################################################
FROM backend-dev AS test
RUN npm run test

###################################################
# Stage: final
###################################################
FROM base AS final
ENV NODE_ENV=production
COPY --chown=node:node --from=test /usr/local/app/package.json /usr/local/app/package-lock.json ./
RUN npm ci --production && \
    npm cache clean --force
COPY --chown=node:node backend/src ./src
COPY --chown=node:node --from=client-build /usr/local/app/dist ./src/static
EXPOSE 3000
CMD ["node", "src/index.js"]
