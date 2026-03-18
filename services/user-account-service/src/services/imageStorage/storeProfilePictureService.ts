import path from "path";
import multer from "multer"
import logger from "../../logger";
import { ImageMetadata } from "../DTOInterface";
import { getUserProfilePictureByUserUUID, insertNewUserProfilePicture } from "../../database/imagesDatabase";
import { constructImageUrl, getNewImageFileName } from "./imageStoreUtils";
import { ValidationCode, ValidationError } from "../../errors/ValidationError";


const MAX_PROFILE_PICTURE_SIZE = +(process.env.MAX_PROFILE_PICTURE_SIZE ?? 1024 * 1024) * 10
const IMAGE_UPLOAD_SERVER = process.env.IMAGE_UPLOAD_SERVER || 'local';

/**
 * Extension of Multer File interface so we get additional fields in response
 */

declare global {
    namespace Express {
        namespace Multer {
            interface File {
                creationTime: number
            }
        }
    }
}

function checkFileType(file: Express.Multer.File, cb: any) {
    const allowed = new Set(["jpeg", "jpg", "png", "webp"]);

    const subtype = (file.mimetype || "").split("/")[1]?.toLowerCase();
    const hasCorrectMime = (file.mimetype || "").startsWith("image/");
    const hasCorrectExt = subtype ? allowed.has(subtype) : false;

    if (hasCorrectMime && hasCorrectExt) {
    return cb(null, true);
    }

    return cb(
    new ValidationError([ {
        field: "profilePic",
        msg: `Invalid image type. Allowed: jpeg|jpg|png|webp. Provided: ${file.mimetype || "unknown"}`,
        value: file.originalname,
        code: ValidationCode.IMAGE_TYPE_NOT_ALLOWED
        }
    ]), false);
}

let storage: multer.StorageEngine

if (IMAGE_UPLOAD_SERVER !== 'local') {
    storage = multer.memoryStorage(); // writes to memory first: req.file.buffer (so later we upload it to the cloud storage)
} else {

    // Local storage path for local testing
    const staticFilesPath = path.join(__dirname, '..','..','..', 'public', 'users-profile-pictures');

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, staticFilesPath);
        },
        filename: async (req, file, cb) => {

            if (!file.mimetype || file.mimetype == "") {
                return cb(new Error("Unexpected error in file name creation."), "");
            }

            const imageType = file.mimetype.split("/")[1]
            const fileName = getNewImageFileName(file.originalname, imageType);

            try {
                file.creationTime = +(fileName.split("-")[0])
            }
            catch(e) {
                return cb(new Error("Unexpected error in file name creation."), "");
            }

            cb(null, fileName);
        }
    });
}

export const uploadProfilePicture = multer({
    storage: storage,
    limits: { fileSize: MAX_PROFILE_PICTURE_SIZE },
    fileFilter: (req, file, cb) => {
        logger.info(`Multer, checking file type for: ${file}`)
        checkFileType(file, cb)
    }
});

/**
 * Stores record about new users profile picture into the database.
 * @param imageData
 */
export const storeProfilePictureMetadata = async (imageData: ImageMetadata) => {
    await insertNewUserProfilePicture(imageData)
}

/**
 * Gets users profile picture URL by users UUID.
 * @param userUUID
 * @returns Always returns URL or empty string (never throws).
 */
export const getUserProfilePictureUrl = async (userUUID: string) : Promise<string> => {
    try {
        const pictureData = await getUserProfilePictureByUserUUID(userUUID)
        return pictureData == null ? "" : constructImageUrl(pictureData);
    }
    catch(e) { // We want to know it, but it is not so serious though ...
        logger.error(`Database error while retrieving user profile image for user ${userUUID}. `, e);
        return ""
    }
}