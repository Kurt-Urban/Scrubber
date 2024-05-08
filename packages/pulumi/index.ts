import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as s3 from "@pulumi/aws/s3";

// Create a bucket and expose it as a website
let siteBucket = new s3.Bucket("s3-website-bucket", {
  website: {
    indexDocument: "index.html",
  },
});

let siteDir = "out"; // Compiled Next.js site

// Deploy site assets
let bucketObject = new s3.BucketObject("nextjs-bucket", {
  bucket: siteBucket,
  source: new pulumi.asset.FileArchive(siteDir),
  key: "index.html",
});

// Wire up the static website bucket with a CDN
let cdn = new aws.cloudfront.Distribution("cdn", {
  origins: [
    {
      originPath: "/",
      domainName: bucketObject.bucket.bucketRegionalDomainName,
      s3OriginConfig: {
        originAccessIdentity: cdnOriginPath,
      },
    },
  ],
  // ...additional configuration
});

// Export the website URL
export const websiteUrl = pulumi.interpolate`http://${siteBucket.websiteEndpoint.hostname}`;

// Export the CloudFront URL
export const cdnUrl = cdn.distributionDomainName.apply((n) => `https://${n}`);
