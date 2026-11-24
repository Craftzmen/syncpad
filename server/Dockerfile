FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 1234
ENV PORT=1234
CMD ["node", "index.mjs"]