import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as synced from "@pulumi/synced-folder";

let siteDir = "../frontend/out";

// Create the S3 bucket with website configuration
const siteBucket = new aws.s3.Bucket("scrubber-frontend", {
  bucket: `scrubber-frontend-${pulumi.getStack()}`,
  acl: "private",
  website: {
    indexDocument: "index.html",
    errorDocument: "index.html",
  },
});

// Disable block public access settings
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
  "publicAccessBlock",
  {
    bucket: siteBucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
  }
);

// Create an Origin Access Identity for CloudFront
let oai = new aws.cloudfront.OriginAccessIdentity("oai");

// Create the bucket policy to allow CloudFront to access the bucket
let siteBucketPolicy = new aws.s3.BucketPolicy("siteBucketPolicy", {
  bucket: siteBucket.id,
  policy: pulumi
    .all([siteBucket.arn, oai.iamArn])
    .apply(([bucketArn, oaiArn]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `${bucketArn}/*`,
          },
        ],
      })
    ),
});

// Sync the folder contents to the S3 bucket
const folder = new synced.S3BucketFolder("synced-folder", {
  path: siteDir,
  bucketName: siteBucket.bucket,
  acl: "private",
});

// Define the CloudFront distribution
let cdn = new aws.cloudfront.Distribution("cdn", {
  origins: [
    {
      originId: siteBucket.bucketDomainName,
      domainName: siteBucket.bucketDomainName,
      s3OriginConfig: {
        originAccessIdentity: oai.cloudfrontAccessIdentityPath,
      },
    },
  ],
  defaultRootObject: "index.html",
  waitForDeployment: false,
  defaultCacheBehavior: {
    targetOriginId: siteBucket.bucketDomainName,
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD"],
    cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6", // CachingOptimized
    originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac", // CORS-S3Origin
  },
  enabled: true,
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
});

// Create an ECS cluster to deploy into.
const cluster = new aws.ecs.Cluster("scrubber-cluster", {});

// Create a load balancer to listen for requests and route them to the container.
const loadbalancer = new awsx.lb.ApplicationLoadBalancer("loadbalancer", {
  listeners: [
    {
      port: 80,
      protocol: "HTTP",
    },
  ],
  defaultTargetGroup: {
    port: 3000,
    protocol: "HTTP",
    targetType: "ip",
    healthCheck: {
      path: "/health", // Set the health check path
      interval: 60, // Interval in seconds
      timeout: 5, // Timeout in seconds
      healthyThreshold: 2, // Number of successful checks before considering healthy
      unhealthyThreshold: 2, // Number of failed checks before considering unhealthy
    },
  },
});

// Create the ECR repository to store our container image
const repo = new awsx.ecr.Repository("repo", {
  forceDelete: true,
});

// Build and publish our application's container image from ./app to the ECR repository.
const image = new awsx.ecr.Image("image", {
  repositoryUrl: repo.url,
  context: "../backend",
  platform: "linux/amd64",
  dockerfile: "../backend/Dockerfile",
});

// Define the service and configure it to use our image and load balancer.
const service = new awsx.ecs.FargateService("scrubber-be", {
  cluster: cluster.arn,
  assignPublicIp: true,
  taskDefinitionArgs: {
    container: {
      name: "scrubber-be-container",
      image: image.imageUri,
      cpu: 128,
      memory: 512,
      essential: true,
      portMappings: [
        {
          containerPort: 3000,
        },
      ],
    },
  },
  desiredCount: 1,
  loadBalancers: [
    {
      targetGroupArn: loadbalancer.defaultTargetGroup.arn,
      containerName: "scrubber-be-container",
      containerPort: 3000,
    },
  ],
});
export default {
  websiteURL: siteBucket.websiteEndpoint,
  cdnURL: pulumi.interpolate`https://${cdn.domainName}`,
  backendURL: pulumi.interpolate`http://${loadbalancer.loadBalancer.dnsName}`,
};
