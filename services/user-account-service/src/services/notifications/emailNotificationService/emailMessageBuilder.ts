import nodemailer from "nodemailer"
import EventEmitter from "events";
import fs from "fs"
import path from "path"
import logger from "../../../logger";

type markNameStr = string;

type markInterpreterAction = (markName: string) => string;

/**
 * Builds message for user verification.
 * Stores message template into memory and interprets user defined marks.
 *
 */
export abstract class MailMessageBuilderBase
{
    message: string = "";

    /**
     * Emits on mark being replaced
     */
    public readonly markReplaceEmitter = new EventEmitter();

    // Default location of the mail templates.
    private messagesBaseLocation: string = "./mailTemplates";

    /** Constructor for MailMessageBuilder.
     * @param templatesLocation Path to directory containing user defined templates.
     */
    constructor(templatesLocation: string = "./mailTemplates") {
        this.messagesBaseLocation = templatesLocation;
    }

    customMarks: Map<markNameStr, markInterpreterAction> = new Map()

    /**
     * Creates path to the message template file.
     * @param templateName
     * @returns Path to the message template.
     */
    protected getMessageTemplatePath(templateName: string): string {
        return path.join(__dirname, this.messagesBaseLocation, templateName + ".txt")
    }

    /**
     * Loads message template into the memory
     * @param templateName The name of the template. Should be same like the file name (case sensitive).
     * @returns void
     */
    public LoadMessageTemplate(templateName: string): void {

        const filePath = this.getMessageTemplatePath(templateName);
        try {
            this.message = fs.readFileSync(filePath, { encoding: 'utf8' });
        }
        catch (err) {
            logger.error(`Message template loading failed. Template \"${filePath}\" not found!`);
        }
    }

    protected getMarkNotated(markName: string): string {
        return `@${markName}@`
    }

    public onMarkReplaced(callback: (markName: string, interpretedValue: string) => void) {
        this.markReplaceEmitter.on('markReplaced', callback);
    }

    AddCustomMark(markName: string, interpreter: markInterpreterAction): void {
        if (!this.verifyMarkName(markName)) {
            throw Error("Custom mark can only consists of letters, numbers or dashes!");
    }
        this.customMarks.set(markName, interpreter);
    }

    abstract ConstructMessage(): string;


    protected verifyMarkName(markName: string): boolean {
        const testRegex = /^[a-zA-Z0-9\-]+$/;
        return testRegex.test(markName);
    }
}

export class MailMessageBuilderSimple extends MailMessageBuilderBase
{

    ConstructMessage(): string {
        // interpret all marks, based on user definitions
        this.customMarks.forEach((interpreterCallback, markName) => {
            const mark = this.getMarkNotated(markName);
            const interpretedValue = interpreterCallback(markName);

            this.message = this.message.replace(new RegExp(mark, 'g'), interpretedValue);

            this.markReplaceEmitter.emit('markReplaced', markName, interpretedValue);
        });

        return this.message;
    }

}