import * as cdk from 'aws-cdk-lib';
import {
  aws_apigateway as apigateway,
  aws_cognito as cognito,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origin,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_s3 as s3,
  aws_s3_notifications as s3Notifications,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';

export class BlogPhotoHostingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const uploadBucket = new s3.Bucket(this, "UploadBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const compressedBucket = new s3.Bucket(this, "CompressedBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origin.S3BucketOrigin.withOriginAccessControl(uploadBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
    });


    const presignedUrlPolicy = new iam.PolicyStatement({
      actions: ["s3:PutObject"],
      resources: [`${uploadBucket.bucketArn}/*`],
      principals: [new iam.AnyPrincipal()],
      conditions: {
        StringEquals: {
          "s3:authType": "REST-QUERY-STRING",
        }
      }
    });

    uploadBucket.addToResourcePolicy(presignedUrlPolicy);

    const bundlingAssetLambdaCode = lambda.Code.fromAsset(
      join(__dirname, "../lambda"),
      {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          bundlingFileAccess: cdk.BundlingFileAccess.VOLUME_COPY,
          command: [
            "bash",
            "-c",
            [
              "export npm_config_cache=$(mktemp -d)",
              "npm i",
              "npx esbuild src/presigned-url-handler.ts --platform=node --bundle --outfile=index.js",
              "cp index.js /asset-output/",
            ].join(" && "),
          ],
        },
      },
    );

    const presignedUrlLambda = new NodejsFunction(this, "presignedUrlLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: bundlingAssetLambdaCode,
      environment: {
        BUCKET_NAME: uploadBucket.bucketName,
      },
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      handler: "index.handler",
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      logRetention: logs.RetentionDays.TWO_WEEKS,
      loggingFormat: lambda.LoggingFormat.JSON,
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_317_0,
    });

    uploadBucket.grantPut(presignedUrlLambda);

    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: false, // Users can only be created from the console
      signInAliases: { email: true },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      authFlows: {
        userPassword: true, // user login with password
        adminUserPassword: true,
      }
    });

    const api = new apigateway.RestApi(this, "BlogPhotoApi", {
      restApiName: "BlogPhotoApi",
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(presignedUrlLambda);

    const auth = new apigateway.CognitoUserPoolsAuthorizer(this, "BlogPhotoAuthorizer", {
      cognitoUserPools: [userPool],
    })

    api.root.addMethod("GET", lambdaIntegration, {
      authorizer: auth,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    const sharpLayer = new lambda.LayerVersion(this, "SharpLayer", {
      code: lambda.Code.fromAsset(join(__dirname, "../layers/sharp-layer.zip")),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "A layer that includes the sharp package",
    });

    const bundlingAssetLambdaCodeCompress = lambda.Code.fromAsset(
      join(__dirname, "../lambda"),
      {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          bundlingFileAccess: cdk.BundlingFileAccess.VOLUME_COPY,
          command: [
            "bash",
            "-c",
            [
              "export npm_config_cache=$(mktemp -d)",
              "npm i",
              "npx esbuild src/compressing-handler.ts --platform=node --bundle --outfile=index.js",
              "cp index.js /asset-output/",
            ].join(" && "),
          ],
        },
      },
    );

    const compressedLambda = new NodejsFunction(this, "compressedLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: bundlingAssetLambdaCodeCompress,
      environment: {
        DESTINATION_BUCKET: compressedBucket.bucketName,
      },
      architecture: lambda.Architecture.X86_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      handler: "index.handler",
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      logRetention: logs.RetentionDays.TWO_WEEKS,
      loggingFormat: lambda.LoggingFormat.JSON,
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_317_0,
      layers: [sharpLayer],
    });

    uploadBucket.grantReadWrite(compressedLambda);
    compressedBucket.grantPut(compressedLambda);

    uploadBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(compressedLambda),
    )

    new cdk.CfnOutput(this, "BucketName", { value: uploadBucket.bucketName });
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "CloudFrontUrl", { value: distribution.distributionDomainName });
  }
}
