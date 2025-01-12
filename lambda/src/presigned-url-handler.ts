import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION || "ap-northeast-1";

const client = new S3Client({ region });

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const bucketName = process.env.BUCKET_NAME;
  console.info("BUCKET_NAME:", bucketName);
  console.info("AWS_REGION:", region);
  if (!bucketName) {
    console.error("BUCKET_NAME is not set");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }

  const objectKey = event.queryStringParameters?.key || "default-object-key";
  const expiration = parseInt(
    event.queryStringParameters?.expiration || "3600",
    10,
  );

  if (isNaN(expiration) || expiration <= 0) {
    console.error("Invalid expiration value:", expiration);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid expiration value" }),
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });
    const url = await getSignedUrl(client, command, { expiresIn: expiration });
    console.info("Generated URL:", url);

    return {
      statusCode: 200,
      body: JSON.stringify({ url }),
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error generating signed URL:", error.message);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Failed to generate signed URL",
          error: error.message,
        }),
      };
    }

    console.error("Unexpected error generating signed URL:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "An unexpected error occured" }),
    };
  }
};
