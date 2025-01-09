import { S3Event } from "aws-lambda";
import {
  generateCompressedKey,
  processImage,
  resizeImage,
} from "utils/image-utils";
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

    console.log(`Processing S3 object: ${bucket}/${key}`);

    const imageBuffer = await fetchImageFromS3(bucket, key);
    const { sharpInstance, outputExtension } = processImage(key, imageBuffer);
    const compressedImage = await resizeImage(sharpInstance);

    const compressedKey = generateCompressedKey(key, outputExtension);
    await uploadToS3(
      DESTINATION_BUCKET,
      compressedKey,
      compressedImage,
      outputExtension,
    );

    console.log(
      `Compressed image uploaded to: ${DESTINATION_BUCKET}/${compressedKey}`,
    );
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
