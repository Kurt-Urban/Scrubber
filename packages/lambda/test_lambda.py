import json
import boto3
from main import lambda_handler
from dotenv import load_dotenv
import os


load_dotenv()


# Define a mock context
class Context:
    def __init__(self):
        self.function_name = "lambda_process_file"
        self.memory_limit_in_mb = 128
        self.invoked_function_arn = (
            "arn:aws:lambda:us-east-1:679410252035:function:lambda_process_file"
        )
        self.aws_request_id = "local_request_id"


def test_lambda_handler():
    with open("event.json") as f:
        event = json.load(f)

    context = Context()

    response = lambda_handler(event, context)

    print("Response:", json.dumps(response, indent=2))

    aws_access_key_id = os.environ["AWS_ACCESS_KEY_ID"]
    aws_secret_access_key = os.environ["AWS_SECRET_ACCESS_KEY"]
    aws_region = os.environ["AWS_REGION"]

    s3 = boto3.client(
        "s3",
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=aws_region,
    )

    destination_bucket_name = "scrubber-processed-files"
    processed_file_key = "processed_" + event["file_key"]
    processed_file = s3.get_object(
        Bucket=destination_bucket_name, Key=processed_file_key
    )
    processed_data = processed_file["Body"].read().decode("utf-8")
    print("Processed Data:")
    print(processed_data)


if __name__ == "__main__":
    test_lambda_handler()
