# state 1: Build from the source files
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

RUN npm ci --only=production

COPY --from=builder /usr/src/app/build ./build
#RUN mkdir -p "/usr/src/app/build/src/services/notifications/emailNotificationService/mailTemplates"
#COPY build/src/services/notifications/emailNotificationService/mailTemplates ./src/services/notifications/emailNotificationService/mailTemplates

CMD ["node", "build/index.js"]