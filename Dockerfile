FROM node:20-alpine

# Font packages for chart rendering
RUN apk add --no-cache fontconfig ttf-dejavu && fc-cache -fv

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

COPY . .
RUN yarn build

CMD ["node", "dist/app.js"]
