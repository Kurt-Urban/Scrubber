import request from "supertest";
import AWSMock from "aws-sdk-mock";
import app from "../src/index";

describe("POST /process", () => {
  afterEach(() => {
    AWSMock.restore();
  });

  it("should handle file upload and processing", async () => {
    // Mock successful file upload to S3
    AWSMock.mock("S3", "upload", (params, callback) => {
      callback(null, {});
    });

    // Mock successful Lambda invocation
    AWSMock.mock("Lambda", "invoke", (params, callback) => {
      callback(null, { StatusCode: 200 });
    });

    // Mock successful file check in processed bucket after 3 retries
    let retryCount = 0;
    AWSMock.mock("S3", "headObject", (params, callback) => {
      if (retryCount < 3) {
        retryCount++;
        console.log(
          `File not found in processed bucket. Retrying in 5 seconds (${retryCount}/3)`
        );
        setTimeout(() => {
          callback({ code: "NotFound" }, null);
        }, 5000);
      } else {
        callback(null, {});
      }
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
  });
});
