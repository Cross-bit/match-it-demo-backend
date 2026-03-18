FROM node:20 as builder

WORKDIR /usr/src/app

COPY package-lock.json .
COPY package.json .

RUN npm ci

COPY . .

RUN npm run build

RUN ls -la /usr/src/app/build

# Stage 2: Create the runtime image
FROM node:20 as production

WORKDIR /usr/src/app

COPY package-lock.json .
COPY package.json .
COPY match-it-backend-free-firebase-adminsdk-5da4g-09ed2d3ef7.json .

RUN npm ci --only=production

COPY --from=builder /usr/src/app/build/src/ ./build

CMD ["node", "build/index.js"]