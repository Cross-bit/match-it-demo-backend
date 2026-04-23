import { MailMessageBuilderSimple, MailMessageBuilderBase } from "./notifications/emailNotificationService/emailMessageBuilder"
import { getApplicationDomainWithProtocol } from "./utils/dataNormalization"
import { MailData, sendMailOverMailgun } from "./notifications/emailNotificationService/mailNotificationClient"

const VERIFICATION_MAIL_TEMPLATE = "VerificationMailTemplate0" // the name of the template for verification
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

    void newlyCreatedUserId;
    void newlyCreatedUserEmail;
}