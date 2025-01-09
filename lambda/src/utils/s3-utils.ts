import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { streamToBuffer } from "./stream-utils";
import { Readable } from "stream";

const s3 = new S3Client({});

// S3 から画像を取得する関数
export const fetchImageFromS3 = async (
  bucket: string,
  key: string,
): Promise<Buffer> => {
  const originalImage = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  if (!originalImage.Body) {
    throw new Error(`Failed to get object body: ${bucket}/${key}`);
  }
  return streamToBuffer(originalImage.Body as Readable);
};

// S3 に画像をアップロードする関数
export const uploadToS3 = async (
  bucket: string,
  key: string,
  body: Buffer,
  extension: string,
): Promise<void> => {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: `image/${extension}`,
    }),
  );
};
