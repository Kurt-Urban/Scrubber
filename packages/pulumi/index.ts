import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as s3 from "@pulumi/aws/s3";

let siteBucket = new s3.Bucket("scrubber-nextjs", {
  website: {
    indexDocument: "index.html",
    errorDocument: "index.html",
  },
  bucket: "scrubber-nextjs",
});

let siteDir = "../frontend/out";

let oai = new aws.cloudfront.OriginAccessIdentity("oai");

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
            Principal: {
              AWS: oaiArn,
            },
            Action: "s3:GetObject",
            Resource: `${bucketArn}/*`,
          },
        ],
      })
    ),
});

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
    forwardedValues: {
      queryString: false,
      cookies: {
        forward: "none",
      },
    },
    minTtl: 0,
    defaultTtl: 3600,
    maxTtl: 86400,
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

export default {
  websiteURL: siteBucket.websiteEndpoint,
  cdnURL: pulumi.interpolate`https://${cdn.domainName}`,
};
