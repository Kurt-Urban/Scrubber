import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import AWS from "aws-sdk";
import multer from "multer";

AWS.config = new AWS.Config({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

const s3 = new AWS.S3();
const lambda = new AWS.Lambda();

app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("Server is healthy");
});

app.post(
  "/process",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const file = req?.file;

    if (!file) {
      return res.status(400).send("No file found in the request");
    }

    const params = {
      Bucket: "scrubber-user-uploads",
      Key: file.originalname,
    };

    const checkFileExists = async () => {
      try {
        await s3.headObject(params).promise();
        return true;
      } catch (error: any) {
        if (error?.code === "NotFound") {
          console.log("Object does not exist");
          return false;
        } else {
          // Handle other potential errors
          console.error("Error occurred:", error);
          throw error;
        }
      }
    };

    const fileExists = await checkFileExists();

    if (!fileExists) {
      try {
        const uploadParams = {
          Bucket: "scrubber-user-uploads",
          Key: file.originalname,
          Body: file.buffer,
          Metadata: {
            ...JSON.parse(req.body.params),
          },
        };

        Object.keys(uploadParams.Metadata).forEach((key) => {
          uploadParams.Metadata[key] = String(uploadParams.Metadata[key]);
        });

        await s3.upload(uploadParams).promise();
      } catch (err) {
        console.error("Error uploading file or invoking Lambda function:", err);
        res.status(500).send("Error processing request");
      }
    }

    const lambdaParams = {
      FunctionName: "lambda_process_file",
      InvocationType: "Event",
      Payload: JSON.stringify({
        bucket: "scrubber-user-uploads",
        key: file.originalname,
        params: JSON.parse(req.body.params),
      }),
    };

    const lambdaRes = await lambda.invoke(lambdaParams).promise();

    console.log("Lambda invocation result:", lambdaRes);

    let retries = 0;

    const checkProcessedBucket = async () => {
      const params = {
        Bucket: "scrubber-processed-files",
        Key: file.originalname,
      };
      try {
        await s3.headObject(params).promise();

        // File exists in processed bucket
        const signedUrl = s3.getSignedUrl("getObject", {
          Bucket: "scrubber-processed-files",
          Key: file.originalname,
          Expires: 60,
        });

        await s3.deleteObject(params).promise();

        // Return the signed URL to the client
        return res.status(200).send(signedUrl);
      } catch (err: any) {
        if (err.code === "NotFound") {
          if (retries < 10) {
            retries++;
            console.log(
              `File not found in processed bucket. Retrying in 5 seconds (${retries}/10)`
            );
            setTimeout(checkProcessedBucket, 5000);
          } else {
            await s3.deleteObject(params).promise();
            console.error(
              "File not found in processed bucket after 10 retries"
            );
            res.status(500).send("Error processing file");
          }
        } else {
          console.error("Error checking processed bucket:", err);
          res.status(500).send("Error processing file");
        }
      }
    };

    checkProcessedBucket();
  }
);

app.get("/buckets", (req: Request, res: Response) => {
  s3.listBuckets((err, data) => {
    if (err) {
      console.error("Error listing buckets:", err);
      res.status(500).send("Error listing buckets");
    } else {
      const bucketNames = data.Buckets?.map((bucket) => bucket.Name) || [];
      res.status(200).json(bucketNames);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
