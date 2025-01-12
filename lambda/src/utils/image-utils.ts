import sharp, { Sharp } from "sharp";
import { extname } from "path";

interface ProcessImageResult {
  sharpInstance: Sharp | null; // null if compression is skipped
  outputExtension: string;
  skipCompression: boolean;
}

export const processImage = (
  key: string,
  imageBuffer: Buffer,
): ProcessImageResult => {
  const inputExtension = extname(key).toLowerCase();
  let outputExtension = "jpeg";
  let sharpInstance = sharp(imageBuffer);
  let skipCompression = false;

  switch (inputExtension) {
    case ".jpeg":
    case ".jpg":
      sharpInstance = sharpInstance.toFormat("jpeg", { quality: 80 });
      break;
    case ".png":
      sharpInstance = sharpInstance.toFormat("png");
      outputExtension = "png";
      break;
    case ".webp":
      sharpInstance = sharpInstance.toFormat("webp", { quality: 80 });
      outputExtension = "webp";
      break;
    case ".gif":
      console.info("GIF format detected, skipping compression");
      skipCompression = true;
      break;
    default:
      console.info(`Unsupported file format: ${inputExtension}`);
      skipCompression = true;
  }

  return { sharpInstance, outputExtension, skipCompression };
};

export const resizeImage = async (sharpInstance: Sharp): Promise<Buffer> => {
  return sharpInstance.resize({ width: 800 }).toBuffer();
};
