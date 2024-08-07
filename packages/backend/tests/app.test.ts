import AWSMock from "aws-sdk-mock";
import app from "../src/index";
import request from "supertest";

const AWS = require("aws-sdk");

describe("POST /process", () => {
  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
  });

  afterEach(() => {
    AWSMock.restore();
    jest.useRealTimers();
  });

  it("should handle file upload and processing", async () => {
    // Mock successful file upload to S3
    AWSMock.mock("S3", "upload", (params, callback) => {
      callback(null, { url: "http://localhost" });
    });

    // Mock successful Lambda invocation
    AWSMock.mock("Lambda", "invoke", (params, callback) => {
      callback(null, { StatusCode: 200 });
    });

    AWSMock.mock("S3", "headObject", (params: any, callback) => {
      if (params.Bucket === "scrubber-processed-files")
        callback(null, { Metadata: { key: "value" } });
      else callback(null, { Metadata: { key: "value" } });
    });

    // Perform a request to your Express server
    const res = await request(app)
      .post("/process")
      .field("params", JSON.stringify({ key: "value" }))
      .attach(
        "file",
        "/Users/kurturban/Coding/Scrubber/packages/backend/tests/test.csv"
      );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("url");
  }, 15000);

  it("should return 400 if no file is provided in the request", async () => {
    const res = await request(app)
      .post("/process")
      .field("params", JSON.stringify({ key: "value" }));

    expect(res.status).toBe(400);
    expect(res.text).toContain("No file found in the request");
  });

  it("should handle S3 upload failure", async () => {
    AWSMock.mock("S3", "headObject", (params, callback) => {
      callback({ code: "NotFound" }, null);
    });
    AWSMock.mock("S3", "upload", (params, callback) => {
      callback(new Error("Upload failed"), null);
    });

    const res = await request(app)
      .post("/process")
      .attach("file", Buffer.from("file content"), "test.csv")
      .field("params", JSON.stringify({ key: "value" }));

    expect(res.status).toBe(500);
    expect(res.text).toContain("Error processing request");
  }, 10000);

  it("should handle Lambda invocation failure", async () => {
    AWSMock.mock("S3", "headObject", (params, callback) => {
      callback({ code: "NotFound" }, null);
    });
    AWSMock.mock("S3", "upload", (params, callback) => {
      callback(null, { Location: "http://example.com/test.csv" });
    });
    AWSMock.mock("Lambda", "invoke", (params, callback) => {
      callback(new Error("Lambda failed"), null);
    });

    const res = await request(app)
      .post("/process")
      .attach("file", Buffer.from("file content"), "test.csv")
      .field("params", JSON.stringify({ key: "value" }));

    expect(res.status).toBe(500);
    expect(res.text).toContain("Error processing request");
  }, 10000);
});
