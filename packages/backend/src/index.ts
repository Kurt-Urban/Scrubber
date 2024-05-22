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
const port = process.env.PORT || 3001;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

app.post("/", upload.single("file"), (req: Request, res: Response) => {
  const file = req?.file;
  if (file) {
    const params = {
      Bucket: "scrubber-user-uploads",
      Key: file.originalname,
    };

    s3.headObject(params, (err, data) => {
      if (err && err.code === "NotFound") {
        // File does not exist in S3, proceed with upload
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

        s3.upload(
          uploadParams,
          (err: Error, _: AWS.S3.ManagedUpload.SendData) => {
            if (err) {
              console.error("Error uploading file to S3:", err);
              res.status(500).send("Error uploading file to S3");
            } else {
              res.status(200).send("File uploaded to S3");
            }
          }
        );
      } else if (data) {
        // File already exists in S3, return error response
        res.status(400).send("File already exists in S3");
      } else {
        // Error occurred while checking S3, return error response
        console.error("Error checking S3:", err);
        res.status(500).send("Error checking S3");
      }
    });
  } else {
    res.status(400).send("No file found in the request");
  }
});

const s3 = new AWS.S3();

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
