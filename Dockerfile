FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html account.html admin.html vite.config.js ./
COPY web ./web
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIRECTORY=/app/data
COPY package*.json ./
RUN npm ci --omit=dev && mkdir /app/data && chown node:node /app/data
COPY services ./services
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["npm","start"]
