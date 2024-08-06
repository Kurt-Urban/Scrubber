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

@mock_s3
class TestLambdaFunction(unittest.TestCase):

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
        self.context = Context()

    @patch("main.boto3.client")
    def test_lambda_handler_success(self, mock_boto_client):
        mock_s3_client = mock_boto_client.return_value
        mock_s3_client.get_object.return_value = {
            'Body': io.BytesIO(b"col1,col2,col3\n1,2,3\n4,5,6\n7,8,9\n")
        }
        mock_s3_client.put_object.return_value = {}

        response = lambda_handler(self.event, self.context)
        self.assertEqual(response["statusCode"], 200)
        self.assertIn("processed_file_key", json.loads(response["body"]))

    @patch("main.boto3.client")
    def test_lambda_handler_error(self, mock_boto_client):
        mock_s3_client = mock_boto_client.return_value
        mock_s3_client.get_object.side_effect = Exception("S3 error")

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
        self.assertEqual(stats["anomalousRows"], 3)

    def test_detect_anomalies(self):
        csv_data = pd.read_csv(io.StringIO("col1,col2,col3\n1,2,3\n4,5,6\n7,8,9\n"))
        anomalous_data, num_anomalies = detect_anomalies(csv_data)
        self.assertEqual(num_anomalies, 3)
        self.assertIn("anomaly", anomalous_data.columns)
        self.assertEqual(anomalous_data["anomaly"].sum(), 3)

if __name__ == "__main__":
    unittest.main()
