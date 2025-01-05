import * as cdk from 'aws-cdk-lib';
import {
  aws_apigateway as apigateway,
  aws_cognito as cognito,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';

export class BlogPhotoHostingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "UploadBucket", {
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
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
              "npx esbuild src/handler.ts --platform=node --bundle --outfile=index.js",
              "cp index.js /asset-output/",
            ].join(" && "),
          ],
        },
      },
    );

    const presignedUrlLambda = new NodejsFunction(this, "presignedUrlLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: bundlingAssetLambdaCode,
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

    bucket.grantPut(presignedUrlLambda);

    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: false, // Users can only be created from the console
      signInAliases: { email: true },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
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

    new cdk.CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
  }
}
