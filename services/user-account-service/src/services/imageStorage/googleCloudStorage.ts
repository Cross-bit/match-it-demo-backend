import { Storage } from '@google-cloud/storage';
import { getNewImageFileName } from './imageStoreUtils';
import logger from '../../logger';

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME ?? "";
const IMAGE_UPLOAD_SERVER = process.env.IMAGE_UPLOAD_SERVER || "local";

let bucketInstance: ReturnType<Storage["bucket"]> | null = null;

function getBucket() {
    if (IMAGE_UPLOAD_SERVER !== "gcs") {
        const msg = "getBucket() called, but IMAGE_UPLOAD_SERVER !== 'gcs'";
        logger.warn(msg);
        throw new Error(msg);
    }

    if (!GCS_BUCKET_NAME) {
        const msg = "Missing required environment variable: GCS_BUCKET_NAME";
        logger.warn(msg);
        throw new Error(msg);
    }

    if (!bucketInstance) {
        const storage = new Storage();
        bucketInstance = storage.bucket(GCS_BUCKET_NAME);
    }

    return bucketInstance;
}

export interface UploadedImageInfo {
    url: string;
    filename: string;
    creationTime: number;
    serverPath: string;
}

export const uploadToGoogleCloudStorage = async (file: Express.Multer.File): Promise<UploadedImageInfo> => {

    if (IMAGE_UPLOAD_SERVER !== "gcs") {
        const msg = "uploadToGoogleCloudStorage called, but IMAGE_UPLOAD_SERVER !== 'gcs'";
        logger.warn(msg);
        throw new Error(msg);
    }

    const bucket = getBucket();

    if (!bucket) {
        const msg = "uploadToGoogleCloudStorage called, but GCS_BUCKET_NAME is missing";
        logger.warn(msg);
        throw new Error(msg);
    }

    if (!file.mimetype || file.mimetype === "") {
        throw new Error("Missing or invalid file mimetype.");
    }

    const imageType = file.mimetype.split("/")[1];
    const filename = getNewImageFileName(file.originalname, imageType);
    const creationTime = +(filename.split("-")[0]);

    const blob = bucket.file(filename);

    const stream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });

    return new Promise((resolve, reject) => {
        stream.on('error', (err: Error) => reject(err));

        stream.on('finish', () => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

            resolve({ url: publicUrl, filename, creationTime, serverPath: bucket.name });
        });

        stream.end(file.buffer);
    });
};