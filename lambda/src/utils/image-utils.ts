import sharp, { Sharp } from "sharp";
import { extname } from "path";

export const processImage = (
  key: string,
  imageBuffer: Buffer,
): { sharpInstance: Sharp; outputExtension: string } => {
  const inputExtension = extname(key).toLowerCase();
  let outputExtension = "jpeg";
  let sharpInstance = sharp(imageBuffer);

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
      console.log("GIF format detected, skipping compression");
      throw new Error("GIF compression is not supported");
    default:
      throw new Error(`Unsupported file format: ${inputExtension}`);
  }

  return { sharpInstance, outputExtension };
};

export const resizeImage = async (sharpInstance: Sharp): Promise<Buffer> => {
  return sharpInstance.resize({ width: 800 }).toBuffer();
};

export const generateCompressedKey = (
  key: string,
  extension: string,
): string => {
  return key.replace(/\.[^/.]+$/, `.${extension}`);
};
