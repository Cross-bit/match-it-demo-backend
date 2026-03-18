import { MailMessageBuilderSimple, MailMessageBuilderBase } from "./notifications/emailNotificationService/emailMessageBuilder"
import { VerificationData } from "./DTOInterface"
import { getApplicationDomainWithProtocol } from "./utils/dataNormalization"
import { sendMailOverGmailAPI, MailData, sendMailOverMailerSend, sendMailOverMailgun } from "./notifications/emailNotificationService/mailNotificationClient"

const VERIFICATION_MAIL_TEMPLATE = "VerificationMailTemplate0" // the name of the template for verification
const RESET_PASSWORD_MAIL_TEMPLATE = "ResetPasswordMailTemplate0"


const getVerificationEmailLink = (verificationToken: string) => {
    return `${getApplicationDomainWithProtocol(true)}/api/v1/credentials/verify/${verificationToken}`;
}

export const sendVerificationEmail = async (
    email: string,
    token: string
) => {

    const messageBuilder: MailMessageBuilderBase = new MailMessageBuilderSimple();
    messageBuilder.LoadMessageTemplate(VERIFICATION_MAIL_TEMPLATE);

    messageBuilder.AddCustomMark("verification-link", () => {
        const verificationLink = getVerificationEmailLink(token);
        return verificationLink;
    });

    const mailText = messageBuilder.ConstructMessage();

    const mailMessage: MailData = {
        to: [email],
        cc: [],
        bcc: [],
        message: {
        subject: "Match-it registration verification",
        html: mailText
        }
    };

    await sendMailOverMailgun(mailMessage);
};

export const sendPasswordResetEmail = async (newlyCreatedUserId: number, newlyCreatedUserEmail: string) => {

    const messageBuilder: MailMessageBuilderBase = new MailMessageBuilderSimple();
    const unixTimeStampSeconds = Date.now()/1000;

    /*const data: VerificationData = {
        creationTime: unixTimeStampSeconds,
        expirationTime: unixTimeStampSeconds + defaultVerificationTimeout, // in seconds
        userId: newlyCreatedUserId,d
    }*/

    /*const verificationKey = enc.encrypt(JSON.stringify(data), verificationTokenKey);

    messageBuilder.LoadMessageTemplate(VERIFICATION_MAIL_TEMPLATE);

    messageBuilder.AddCustomMark("verification-link", (markName: string) => {

        const verificationToken =  verificationKey.iv + verificationKey.encryptedData; // first 32 hex chars (16 bytes) of the token is iv

        const verificationLink = getVerificationEmailLink(verificationToken);
        return verificationLink;
    });*/
}