import admin from "firebase-admin"
import { getMessaging } from "firebase-admin/messaging";
import { DataFCM, dataFCMType } from "./interface";
import { readFileSync } from "fs";
import logger from "../../logger";
import path from "path";

// INIT firebase client

let serviceAccount;

if (process.env.FIREBASE_CREDENTIALS_JSON) {
  logger.info("[Firebase FCM]: using credentials from ENV");

  serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

} else if (process.env.FIREBASE_APPLICATION_CREDENTIALS) {
  const filePath = process.env.FIREBASE_APPLICATION_CREDENTIALS;

  logger.info(`[Firebase FCM]: using credentials file: ${filePath}`);

  const serviceAccountJsonKey = JSON.parse(
    readFileSync(path.resolve(filePath), "utf-8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountJsonKey),
  });

} else {
  logger.info("[Firebase FCM]: using application default credentials");

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}


/**
 * Sends simple FCM Notification, these are implicitly shown to the user on frontend, but are not captured on the background...
 * @param title
 * @param message
 * @param recipients
 */
export const sendFCMNotification = async (title: string, message: string, recipients: string[]) => {
  try {

      logger.info("[FCM SENDING] Sending fcm notification to recipients: ");
      recipients.forEach(r => logger.info(`- ${r}`));
      logger.info(`message title: ${title}`);
      logger.info(`body: ${message}`);

      const fcmMessages = recipients.map(recipient => ({
          notification: {
            title,
            body: message
          },
          token: recipient
      }));

      sendFcmMessages(fcmMessages);

    }
    catch(error) {
      logger.error("There was an error sending FCM message!", error);
      logger.error(error);
    }
}



/** Sends FCM message to given recipients.
 * FCM message is handled by onMessageReceived on the background as well as on the foreground.
 * User is not notified implicitly through android notification screen (this must be handled explicitly).
 *
 *
 * @param data specific FCM data to send
 * @param recipients list of fcm tokens
 */
export const sendFCMDataMessage = async (data: DataFCM, recipients: string[]) => {
  try {

    logger.info("[FCM SENDING]: Sending fcm data message to multiple recipients: ");
    recipients.forEach(r => logger.info(`- ${r}`));

    const fcmMessages = recipients.map(recipient => ({
        data: {
          type: dataFCMType[data.type],
          payload: JSON.stringify(data.data)
        },
        token: recipient
      }));

      sendFcmMessages(fcmMessages);

  }
  catch(error) {
    logger.error("There was an error sending FCM data message!", error);
    logger.error(error);
  }
}


const sendFcmMessages = (fcmMessages: any[]) => {

  for (const fcmMessage of fcmMessages) {
    getMessaging()
    .send(fcmMessage)
    .then((response: any) => {
      logger.info("Successfully sent message:", response);
    })
    .catch((error: any) => {
      logger.error("Error sending message:", error);
    });
  }
}

