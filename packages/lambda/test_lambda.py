import json
import boto3
import pandas as pd
import io
from main import lambda_handler, preprocess_data, detect_anomalies
from dotenv import load_dotenv
import os
import unittest
from unittest.mock import patch, MagicMock
from moto import mock_s3

# Load environment variables from .env file
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

    try:
        print(f"Fetching processed file from S3: {processed_file_key}")
        processed_file = s3.get_object(
            Bucket=destination_bucket_name, Key=processed_file_key
        )
        processed_data = processed_file["Body"].read().decode("utf-8")
        print("Processed Data:")
        print(processed_data)
    except s3.exceptions.NoSuchKey:
        print(f"No such key: {processed_file_key}")
    except Exception as e:
        print(f"Error fetching processed file: {e}")

class TestLambdaFunction(unittest.TestCase):

    @mock_s3
    def setUp(self):
        # Set up mock S3
        self.s3 = boto3.client("s3", region_name="us-east-1")
        self.source_bucket = "scrubber-user-uploads"
        self.destination_bucket = "scrubber-processed-files"
        self.s3.create_bucket(Bucket=self.source_bucket)
        self.s3.create_bucket(Bucket=self.destination_bucket)

        # Upload a mock CSV file
        self.file_key = "test.csv"
        csv_data = "col1,col2,col3\n1,2,3\n4,5,6\n7,8,9\n"
        self.s3.put_object(Bucket=self.source_bucket, Key=self.file_key, Body=csv_data)

        # Define event and context
        self.event = {
            "file_key": self.file_key,
            "cleaning_options": {
                "dropDuplicates": False,
                "dropColumns": ["col3"],
                "fillNa": "drop",
                "enableAnomalyDetection": True
            }
        }
        self.context = MagicMock()

    def test_lambda_handler_success(self):
        response = lambda_handler(self.event, self.context)
        self.assertEqual(response["statusCode"], 200)
        self.assertIn("processed_file_key", json.loads(response["body"]))

    def test_lambda_handler_error(self):
        with patch("main.s3.get_object", side_effect=Exception("S3 error")):
            response = lambda_handler(self.event, self.context)
            self.assertEqual(response["statusCode"], 500)
            self.assertIn("error", json.loads(response["body"]))

    def test_preprocess_data(self):
        csv_data = pd.read_csv(io.StringIO("col1,col2,col3\n1,2,3\n4,5,6\n7,8,9\n"))
        options = {
            "dropDuplicates": False,
            "dropColumns": ["col3"],
            "fillNa": "drop",
            "enableAnomalyDetection": True
        }
        processed_data, report, stats = preprocess_data(csv_data, options)
        self.assertIn("Dropped columns: col3", report)
        self.assertEqual(stats["totalRows"], 3)
        self.assertEqual(stats["anomalousRows"], 0)

    def test_detect_anomalies(self):
        csv_data = pd.read_csv(io.StringIO("col1,col2,col3\n1,2,3\n4,5,6\n7,8,9\n"))
        anomalous_data, num_anomalies = detect_anomalies(csv_data)
        self.assertEqual(num_anomalies, 0)
        self.assertIn("anomaly", anomalous_data.columns)
        self.assertEqual(anomalous_data["anomaly"].sum(), 0)

if __name__ == "__main__":
    test_lambda_handler()
    unittest.main()
