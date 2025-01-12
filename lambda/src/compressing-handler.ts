import { S3Event } from "aws-lambda";
import { processImage, resizeImage } from "utils/image-utils";
import { fetchImageFromS3, uploadToS3 } from "utils/s3-utils";

const DESTINATION_BUCKET = process.env.DESTINATION_BUCKET;

export const handler = async (event: S3Event): Promise<void> => {
  try {
    if (!DESTINATION_BUCKET) {
      throw new Error("DESTINATION_BUCKET is not set");
    }

    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key);

    console.info(`Processing S3 object: ${bucket}/${key}`);

    const imageBuffer = await fetchImageFromS3(bucket, key);
    const { sharpInstance, outputExtension, skipCompression } = processImage(
      key,
      imageBuffer,
    );

    if (skipCompression) {
      console.error(`Skipping compression for: ${key}`);
      return;
    }

    if (!sharpInstance) {
      throw new Error(
        "sharpInstance is null. This should not happen if skipCompression is false",
      );
    }

    const compressedImage = await resizeImage(sharpInstance);

    await uploadToS3(DESTINATION_BUCKET, key, compressedImage, outputExtension);

    console.info(`Compressed image uploaded to: ${DESTINATION_BUCKET}/${key}`);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
