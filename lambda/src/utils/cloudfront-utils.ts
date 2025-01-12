import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";

const cloudFrontClient = new CloudFrontClient({});

export const invalidateCache = async (
  distributionId: string,
  paths: string[],
): Promise<void> => {
  try {
    const command = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    });

    await cloudFrontClient.send(command);
    console.log(
      `Cache invalidation request sent for distribution: ${distributionId}`,
    );
  } catch (error) {
    console.error("Error invalidating cache:", error);
    throw error;
  }
};
