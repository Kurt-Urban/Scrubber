import * as dotenv from "dotenv";
dotenv.config({ path: "packages/backend/.env" });

import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import AWS from "aws-sdk";
import multer from "multer";

let s3: AWS.S3;
let lambda: AWS.Lambda;

function configureAWS() {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });

  s3 = new AWS.S3();
  lambda = new AWS.Lambda();
}

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("Server is healthy");
});

app.post(
  "/process",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!s3 || !lambda) {
      configureAWS();
    }
    const file = req?.file;

    if (!file) {
      return res.status(400).send("No file found in the request");
    }

    const params = {
      Bucket: process.env.USER_BUCKET_NAME as string,
      Key: file.originalname,
    };

    const checkFileExists = async () => {
      try {
        await s3.headObject(params).promise();
        return true;
      } catch (error: any) {
        if (error?.code === "NotFound") {
          return false;
        } else {
          // Handle other potential errors
          console.error("Error occurred:", error);
          throw error;
        }
      }
    };

    // Check if the file already exists in the user uploads bucket
    const fileExists = await checkFileExists();

    // If the file doesn't exist, upload it to S3
    if (!fileExists) {
      try {
        const uploadParams = {
          Bucket: process.env.USER_BUCKET_NAME as string,
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
        console.error("Error uploading file to S3:", err);
        res.status(500).send("Error processing request");
      }
    }

    const lambdaParams = {
      FunctionName: "lambda_process_file",
      InvocationType: "Event",
      Payload: JSON.stringify({
        bucket: process.env.USER_BUCKET_NAME as string,
        key: file.originalname,
        params: JSON.parse(req.body.params),
      }),
    };

    // Invoke the Lambda function to process the file
    try {
      await lambda.invoke(lambdaParams).promise();
    } catch (err) {
      console.error("Error invoking Lambda function:", err);
      return res.status(500).send("Error processing request");
    }

    const checkProcessedBucket = async (): Promise<
      | {
          url?: string;
          metadata?: AWS.S3.HeadObjectOutput;
        }
      | undefined
    > => {
      const processedParams = {
        Bucket: process.env.PROCESSED_BUCKET_NAME as string,
        Key: "processed_" + file.originalname,
      };

      const maxRetries = 3;
      const delay = 3000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Check if the file exists in the processed bucket
          const processedHeadObject = await s3
            .headObject(processedParams)
            .promise();

          // File exists in processed bucket
          const signedUrl = s3.getSignedUrl("getObject", {
            Bucket: process.env.PROCESSED_BUCKET_NAME as string,
            Key: "processed_" + file.originalname,
            Expires: 60,
          });

          return { url: signedUrl, metadata: processedHeadObject.Metadata };
        } catch (processedErr: any) {
          if (processedErr.code !== "NotFound") {
            console.error("Error checking processed bucket:", processedErr);
            throw processedErr;
          }
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      console.error("File not processed within the expected time frame");
      throw new Error("File not processed within the expected time frame");
    };

    try {
      const response = await checkProcessedBucket();
      if (!response) {
        return res.status(400).send("File not processed");
      }
      return res.status(200).send(response);
    } catch (error) {
      console.error("Error processing file:", error);
      return res.status(500).send("Error processing file");
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
