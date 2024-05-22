import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as s3 from "@pulumi/aws/s3";
import * as synced from "@pulumi/synced-folder";

let siteDir = "../frontend/out";

// Create the S3 bucket with website configuration
const siteBucket = new aws.s3.Bucket("scrubber-frontend", {
  bucket: "scrubber-frontend",
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

// Create an AWS S3 bucket
const backendBucket = new aws.s3.Bucket("scrubber-backend", {
  bucket: "scrubber-backend",
});

// Upload the Express.js app bundle to the S3 bucket
const backendZip = new aws.s3.BucketObject("backend", {
  bucket: backendBucket.bucket,
  source: new pulumi.asset.FileAsset("../backend/backend.zip"),
  contentType: "application/zip",
});

// Create an Elastic Beanstalk application
const app = new aws.elasticbeanstalk.Application("scrubber-backend-app", {
  name: "scrubber-backend-app",
});

// Create an Elastic Beanstalk application version
const appVersion = new aws.elasticbeanstalk.ApplicationVersion("appVersion", {
  application: app.name,
  bucket: backendBucket.bucket,
  key: backendZip.key,
  description: "Version for scrubber-backend-app",
  tags: {
    s3Bucket: backendBucket.bucket,
    s3Key: backendZip.key,
  },
});

// Define the policy document to assume the role
const assumeRolePolicy = aws.iam.getPolicyDocument({
  statements: [
    {
      effect: "Allow",
      principals: [
        {
          type: "Service",
          identifiers: ["ec2.amazonaws.com"],
        },
        {
          type: "Service",
          identifiers: ["elasticbeanstalk.amazonaws.com"],
        },
      ],
      actions: ["sts:AssumeRole"],
    },
  ],
});

// Function to create or get existing IAM role
async function getOrCreateRole(roleName: string) {
  try {
    const existingRole = await aws.iam.getRole({ name: roleName });
    return existingRole;
  } catch (error) {
    if ((error as any).code === "NoSuchEntity") {
      const newRole = new aws.iam.Role(roleName, {
        name: roleName,
        path: "/",
        assumeRolePolicy: assumeRolePolicy.then((policy) => policy.json),
      });
      return newRole;
    } else {
      throw error;
    }
  }
}

(async () => {
  // Create or get the IAM role
  const role = await getOrCreateRole("es_role");

  // Attach the necessary policies to the role
  const managedPolicies = [
    "arn:aws:iam::aws:policy/AWSElasticBeanstalkFullAccess",
    "arn:aws:iam::aws:policy/AWSElasticBeanstalkService",
  ];

  managedPolicies.forEach((policyArn) => {
    new aws.iam.RolePolicyAttachment(`${policyArn.split("/").pop()}`, {
      role: role.name,
      policyArn: policyArn,
    });
  });

  // Create an instance profile for the IAM role
  const instanceProfile = new aws.iam.InstanceProfile("es_profile", {
    name: "es_profile",
    role: role.name,
  });

  // Create an AWS S3 bucket
  const backendBucket = new aws.s3.Bucket("scrubber-backend", {
    bucket: "scrubber-backend",
  });

  // Upload the Express.js app bundle to the S3 bucket
  const backendZip = new aws.s3.BucketObject("backend", {
    bucket: backendBucket.bucket,
    source: new pulumi.asset.FileAsset("../backend/backend.zip"),
    contentType: "application/zip",
  });

  // Create an Elastic Beanstalk application
  const app = new aws.elasticbeanstalk.Application("scrubber-backend-app", {
    name: "scrubber-backend-app",
  });

  // Create an Elastic Beanstalk application version
  const appVersion = new aws.elasticbeanstalk.ApplicationVersion("appVersion", {
    application: app.name,
    bucket: backendBucket.bucket,
    key: backendZip.key,
    description: "Version for scrubber-backend-app",
    tags: {
      s3Bucket: backendBucket.bucket,
      s3Key: backendZip.key,
    },
  });

  // Create an Elastic Beanstalk environment using the Node.js solution stack
  const env = new aws.elasticbeanstalk.Environment("scrubber-backend-env", {
    application: app.name,
    solutionStackName: "64bit Amazon Linux 2023 v6.1.5 running Node.js 20",
    version: appVersion,
    settings: [
      {
        namespace: "aws:autoscaling:launchconfiguration",
        name: "IamInstanceProfile",
        value: instanceProfile.arn,
      },
      {
        namespace: "aws:elasticbeanstalk:environment:process:default",
        name: "PORT",
        value: "8080",
      },
    ],
  });
})();

// Export the URLs
export default {
  websiteURL: siteBucket.websiteEndpoint,
  cdnURL: pulumi.interpolate`https://${cdn.domainName}`,
  backendBucketName: backendBucket.bucket,
};
