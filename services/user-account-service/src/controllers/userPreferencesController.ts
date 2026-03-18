import { Request, Response } from "express";
import * as DTO from "../services/DTOInterface"
import { storeProfilePictureMetadata } from "../services/imageStorage/storeProfilePictureService"
import logger from "../logger";
import { ImageMetadata } from "../services/DTOInterface";
import { constructImageUrl } from "../services/imageStorage/imageStoreUtils";
import { getUserProfilePictureByUserUUID } from "../database/imagesDatabase";
import { UploadedImageInfo, uploadToGoogleCloudStorage } from "../services/imageStorage/googleCloudStorage";


/*
    This is the controller for user account creation/authentication using
*/
const IMAGE_UPLOAD_SERVER = process.env.IMAGE_UPLOAD_SERVER || 'local';

const GALLERY_BASE_URL = process.env.GALLERY_BASE_URL ?? "";
const STATIC_FILES_BASE_PATH = "/usr/src/app/public";

export const uploadProfilePicture = async (req: Request, res: Response) => {
    try {

        logger.info("[ACTION:] UPLOADING PROFILE PICTURE")

        if (!req.file) {
            logger.error("No file uploaded!")
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const userUUID = req.userData.sub;

        let newImageData: ImageMetadata = {} as ImageMetadata

        if (IMAGE_UPLOAD_SERVER === 'gcs') {
            const gcsUploadResult: UploadedImageInfo = await uploadToGoogleCloudStorage(req.file)
            newImageData = {
                ownerUUID: userUUID,
                serverUrl: GALLERY_BASE_URL, // 'https://storage.googleapis.com'
                serverPath: gcsUploadResult.serverPath,
                creationTime: new Date(gcsUploadResult.creationTime),
                name: gcsUploadResult.filename,
            } as ImageMetadata
        }
        else {
            newImageData = {
                ownerUUID: userUUID,
                serverUrl: GALLERY_BASE_URL, // it is (this == local) hosting server
                serverPath: req.file.destination.slice(req.file.destination.indexOf(STATIC_FILES_BASE_PATH) + STATIC_FILES_BASE_PATH.length),
                creationTime: new Date(req.file.creationTime),
                name: req.file.filename,
            } as ImageMetadata;
        }

        await storeProfilePictureMetadata(newImageData);

        logger.info("Image uploaded successfully,new image data: ", newImageData);

        const imgUrl = await constructImageUrl(newImageData);

        return res.send({
            url: imgUrl,
            creationTime: newImageData.creationTime.toUTCString(),
        } as DTO.ImageResponseDTO)
    }
    catch(e) {
        logger.error("New image upload failed", {e});
        return res.status(500).send({
            name: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong during image upload",
            status: 500
        })
    }
}

export const getUserProfilePicture = async (req: Request, res: Response) => {
    try {
        const userUUID = req.userData.sub;
        const profilePicture = await getUserProfilePictureByUserUUID(userUUID);

        if (!profilePicture) {
            return res.status(404).json({
                name: "PROFILE_PICTURE_NOT_FOUND",
                message: "No profile picture exists",
                status: 404
            })
        }

        const imgUrl = await constructImageUrl(profilePicture as ImageMetadata);

        return res.status(200).json({
            url: imgUrl
        })
    }
    catch(e) {
        res.status(500).json({
            name: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong during image fetch",
            status: 500
        })
    }
}
