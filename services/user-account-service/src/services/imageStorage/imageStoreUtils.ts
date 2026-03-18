import path from "path";
import { ImageMetadata } from "../DTOInterface";



/**
 * Constructs new image file name based on the input parameters.
 *
 * @param originalName
 * @param imageType
 * @returns
 */
export const getNewImageFileName = (originalName: string, imageType: string) : string => {
    return `${Date.now()}-${originalName}.${imageType}`
}

/**
 * Creates full image path based on the provided image metadata.
 *
 * @param imageData
 * @returns
 */
export const constructImageUrl = async (imageData: ImageMetadata) : Promise<string> => {
    return path.join(imageData.serverUrl, imageData.serverPath, imageData.name);
}