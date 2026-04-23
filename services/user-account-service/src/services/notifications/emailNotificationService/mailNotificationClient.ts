import * as nodemailer from "nodemailer";
import SMTPTransport from "nodemailer";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

import { google } from 'googleapis';
import logger from "../../../logger";

const CLIENT_ID = '370238596394-3r2m5qe0qnlv1okfmkotcf45k3m6nkp8.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = '1//04on_fyeVs0ZCCgYIARAAGAQSNgF-L9IrqPemvR4DWGdWKIbVwRJdE0UcyKWWd1p-vedcOKjp0Nt1-My2pY6WTddO_NiBYbPkXQ';


const VERIFICATION_MAIL_SENDER_MAIL = process.env.VERIFICATION_MAIL_SENDER ?? "andrew@matchit.cz" // the sender of the mail recipient will get
const VERIFICATION_MAIL_SENDER_NAME = "Andrew"

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

export interface MailData {
    replyTo?: string
    to: string[]
    //toUids
    cc: string[]
    //ccUids:
    bcc: string[]
   // bccUids:
    //headers:
    message: {
        subject: string
        html: string
    }
}

export const removeTags = (str: string): string => {
    return str.replace(/(<([^>]+)>)/ig, '');
}

export const sendMailOverGmailAPI = async (mailData: MailData) => {

    try {
        logger.info(CLIENT_ID);
        logger.info(CLIENT_SECRET);
        logger.info(REFRESH_TOKEN);

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'ondra.kryz@gmail.com',
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
            }
        });


        const mailOptions = {
            from: 'ondra.kryz@gmail.com',
            to: mailData.to,
            subject: mailData.message.subject,
            text: removeTags(mailData.message.html),
            html: mailData.message.html,
        };

        const result = await transport.sendMail(mailOptions);

        return result;

    } catch (error) {
        logger.error("Error while sending mail", error)
        return error;
    }
}


export const sendMailOverMailerSend = async (mailData: MailData) => {

    try {
        const MAILER_SEND_API_KEY = process.env.EMAIL_MAILERSEND_API_KEY ?? ""

        if (MAILER_SEND_API_KEY == "")
            throw Error("Missing email api key")

        const mailerSend = new MailerSend({
            apiKey: MAILER_SEND_API_KEY,
        });

        const sentFrom = new Sender(VERIFICATION_MAIL_SENDER_MAIL, VERIFICATION_MAIL_SENDER_NAME);

        const recipients: Recipient[] = mailData.to.map(rec => new Recipient(rec, rec.slice(0, rec.indexOf("@"))))

        const emailParams = new EmailParams()
            .setFrom(sentFrom)
            .setTo(recipients)
            .setReplyTo(sentFrom)
            .setSubject(mailData.message.subject)
            .setHtml(mailData.message.html);

        const apiResult = await mailerSend.email.send(emailParams);

        console.log("mail send api res: ");
        console.log(apiResult);

    } catch (error) {
        logger.error("Error while sending mail", error)
        return error;
    }
}

import FormData from "form-data";
import Mailgun from "mailgun.js";

const MAILGUN_API_KEY = process.env.EMAIL_MAILGUN_API_KEY ?? "";
const MAILGUN_DOMAIN = process.env.EMAIL_MAILGUN_DOMAIN ?? "matchit.cz";
const MAILGUN_REGION = process.env.EMAIL_MAILGUN_REGION ?? "eu"; // "us" | "eu"

if (!MAILGUN_API_KEY) {
    throw new Error("Missing Mailgun API key");
}

const mailgun = new Mailgun(FormData);

const mg = mailgun.client({
    username: "api",
    key: MAILGUN_API_KEY,
    url:
        MAILGUN_REGION === "eu"
            ? "https://api.eu.mailgun.net"
            : "https://api.mailgun.net",
});


export const sendMailOverMailgun = async (mailData: MailData) => {
    try {
        const result = await mg.messages.create(MAILGUN_DOMAIN, {
            from: `${VERIFICATION_MAIL_SENDER_NAME} <${VERIFICATION_MAIL_SENDER_MAIL}>`,
            to: mailData.to,
            cc: mailData.cc.length ? mailData.cc : undefined,
            bcc: mailData.bcc.length ? mailData.bcc : undefined,
            subject: mailData.message.subject,
            html: mailData.message.html,
            text: removeTags(mailData.message.html),
            "h:Reply-To": mailData.replyTo ?? VERIFICATION_MAIL_SENDER_MAIL,
        });

        logger.info("Mailgun send result", result);
        return result;

    } catch (error) {
        logger.error("Error while sending mail over Mailgun", error);
        return error;
    }
};