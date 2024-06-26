import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as synced from "@pulumi/synced-folder";
import * as archive from "@pulumi/archive";

// let siteDir = "../frontend/out";

// // Create the S3 bucket with website configuration
// const siteBucket = new aws.s3.Bucket("scrubber-frontend", {
//   bucket: `scrubber-frontend`,
//   acl: "private",
//   website: {
//     indexDocument: "index.html",
//     errorDocument: "index.html",
//   },
// });

// // Disable block public access settings
// const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
//   "publicAccessBlock",
//   {
//     bucket: siteBucket.id,
//     blockPublicAcls: false,
//     blockPublicPolicy: false,
//     ignorePublicAcls: false,
//     restrictPublicBuckets: false,
//   }
// );

// // Create an Origin Access Identity for CloudFront
// let oai = new aws.cloudfront.OriginAccessIdentity("oai");

// // Create the bucket policy to allow CloudFront to access the bucket
// let siteBucketPolicy = new aws.s3.BucketPolicy("siteBucketPolicy", {
//   bucket: siteBucket.id,
//   policy: pulumi
//     .all([siteBucket.arn, oai.iamArn])
//     .apply(([bucketArn, oaiArn]) =>
//       JSON.stringify({
//         Version: "2012-10-17",
//         Statement: [
//           {
//             Effect: "Allow",
//             Principal: "*",
//             Action: "s3:GetObject",
//             Resource: `${bucketArn}/*`,
//           },
//         ],
//       })
//     ),
// });

// // Sync the folder contents to the S3 bucket
// const folder = new synced.S3BucketFolder("synced-folder", {
//   path: siteDir,
//   bucketName: siteBucket.bucket,
//   acl: "private",
// });

// // Define the CloudFront distribution
// let cdn = new aws.cloudfront.Distribution("cdn", {
//   origins: [
//     {
//       originId: siteBucket.bucketDomainName,
//       domainName: siteBucket.bucketDomainName,
//       s3OriginConfig: {
//         originAccessIdentity: oai.cloudfrontAccessIdentityPath,
//       },
//     },
//   ],
//   defaultRootObject: "index.html",
//   waitForDeployment: false,
//   defaultCacheBehavior: {
//     targetOriginId: siteBucket.bucketDomainName,
//     viewerProtocolPolicy: "redirect-to-https",
//     allowedMethods: ["GET", "HEAD", "OPTIONS"],
//     cachedMethods: ["GET", "HEAD"],
//     cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6", // CachingOptimized
//     originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac", // CORS-S3Origin
//   },
//   enabled: true,
//   restrictions: {
//     geoRestriction: {
//       restrictionType: "none",
//     },
//   },
//   viewerCertificate: {
//     cloudfrontDefaultCertificate: true,
//   },
// });

// // Create an ECS cluster to deploy into.
// const cluster = new aws.ecs.Cluster("scrubber-cluster", {});

// const awsxExpressSetup = async () => {
//   // Create a load balancer to listen for requests and route them to the container.
//   const loadbalancer = await new awsx.lb.ApplicationLoadBalancer(
//     "loadbalancer",
//     {
//       listeners: [
//         {
//           port: 80,
//           protocol: "HTTP",
//         },
//       ],
//       defaultTargetGroup: {
//         port: 3000,
//         protocol: "HTTP",
//         targetType: "ip",
//         healthCheck: {
//           path: "/health",
//           interval: 60,
//           timeout: 5,
//           healthyThreshold: 2,
//           unhealthyThreshold: 2,
//         },
//       },
//     }
//   );

//   // Create the ECR repository to store our container image
//   const repo = await new awsx.ecr.Repository("repo", {
//     forceDelete: true,
//   });

//   // Build and publish our application's container image from ./app to the ECR repository.
//   const image = await new awsx.ecr.Image("image", {
//     repositoryUrl: repo.url,
//     context: "../backend",
//     platform: "linux/amd64",
//     dockerfile: "../backend/Dockerfile",
//   });

//   // Define the service and configure it to use our image and load balancer.
//   const service = await new awsx.ecs.FargateService("scrubber-be", {
//     cluster: cluster.arn,
//     assignPublicIp: true,
//     taskDefinitionArgs: {
//       container: {
//         name: "scrubber-be-container",
//         image: image.imageUri,
//         cpu: 128,
//         memory: 512,
//         essential: true,
//         portMappings: [
//           {
//             containerPort: 3000,
//           },
//         ],
//       },
//     },
//     desiredCount: 1,
//     loadBalancers: [
//       {
//         targetGroupArn: loadbalancer.defaultTargetGroup.arn,
//         containerName: "scrubber-be-container",
//         containerPort: 3000,
//       },
//     ],
//   });

//   return { loadBalancerDNS: loadbalancer.loadBalancer.dnsName };
// };

// const backendPromise = awsxExpressSetup();

const lambdaBucket = new aws.s3.Bucket("scrubber-lambda-deployment", {
  bucket: "scrubber-lambda-deployment",
});

const lambdaDeployment = new aws.s3.BucketObject("lambda_deployment_zip", {
  bucket: lambdaBucket.id,
  source: new pulumi.asset.FileAsset("../lambda/lambda_deployment.zip"),
  key: "lambda_deployment.zip",
});

const assumeRole = aws.iam.getPolicyDocument({
  statements: [
    {
      effect: "Allow",
      principals: [
        {
          type: "Service",
          identifiers: ["lambda.amazonaws.com"],
        },
      ],
      actions: ["sts:AssumeRole"],
    },
  ],
});

const iamForLambda = new aws.iam.Role("iam_for_lambda", {
  name: "iam_for_lambda",
  assumeRolePolicy: assumeRole.then((assumeRole) => assumeRole.json),
  managedPolicyArns: [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
  ],
});

const processingLambda = new aws.lambda.Function("file_processing_lambda", {
  s3Bucket: lambdaBucket.bucket,
  s3Key: lambdaDeployment.key,
  name: "lambda_process_file",
  role: iamForLambda.arn,
  handler: "main.lambda_handler",
  runtime: aws.lambda.Runtime.Python3d11,
});

// Create S3 bucket for user uploads and processed files
const userUploadsBucket = new aws.s3.Bucket("scrubber-user-uploads", {
  acl: "private",
  bucket: "scrubber-user-uploads",
});

const processedFilesBucket = new aws.s3.Bucket("scrubber-processed-files", {
  acl: "private",
  bucket: "scrubber-processed-files",
});

// backendPromise.catch((err) => {
//   console.error(err);
// });

export default {
  // websiteURL: siteBucket.websiteEndpoint,
  // cdnURL: pulumi.interpolate`https://${cdn.domainName}`,
  lambdaARN: processingLambda.arn,
  // backendURL: backendPromise.then((res) => res.loadBalancerDNS),
};
