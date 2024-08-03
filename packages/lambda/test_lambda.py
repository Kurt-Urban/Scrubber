import json
import boto3
import pandas as pd
import io
from main import lambda_handler, preprocess_data, detect_anomalies, fill_missing_values, correct_data_formats, sanitize_metadata_value, read_csv_from_s3, write_csv_to_s3
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
        self.context = Context()

    @mock_s3
    def test_lambda_handler_success(self):
        response = lambda_handler(self.event, self.context)
        self.assertEqual(response["statusCode"], 200)
        self.assertIn("processed_file_key", json.loads(response["body"]))

    @mock_s3
    @patch("main.s3.get_object", side_effect=Exception("S3 error"))
    def test_lambda_handler_error(self, mock_get_object):
        response = lambda_handler(self.event, self.context)
        self.assertEqual(response["statusCode"], 500)
        self.assertIn("error", json.loads(response["body"]))

    @patch("main.s3.get_object")
    def test_read_csv_from_s3(self, mock_get_object):
        mock_get_object.return_value = {'Body': io.BytesIO(b"col1,col2\n1,2\n3,4")}
        df = read_csv_from_s3("test_bucket", "test_key")
        self.assertEqual(df.shape, (2, 2))

    @patch("main.s3.put_object")
    def test_write_csv_to_s3(self, mock_put_object):
        df = pd.DataFrame({"col1": [1, 2], "col2": [3, 4]})
        write_csv_to_s3(df, "test_bucket", "test_key", "test_report", {
            "totalRows": 2, "duplicateRows": 0, "modifiedRows": 0, "corruptedRows": 0, "anomalousRows": 0})
        mock_put_object.assert_called_once()

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

    def test_fill_missing_values_drop(self):
        csv_data = pd.read_csv(io.StringIO("col1,col2,col3\n1,,3\n4,5,6\n7,8,\n"))
        filled_data = fill_missing_values(csv_data, "drop", None, None)
        self.assertEqual(len(filled_data), 1)  # Only one row should remain

    def test_fill_missing_values_fill(self):
        csv_data = pd.read_csv(io.StringIO("col1,col2,col3\n1,,3\n4,5,6\n7,8,\n"))
        filled_data = fill_missing_values(csv_data, "fill", "mean", None)
        self.assertFalse(filled_data.isnull().values.any())  # No missing values

    def test_correct_data_formats(self):
        csv_data = pd.read_csv(io.StringIO("date,col2,col3\n2021-01-01,2,3\n2021-02-01,5,6\n2021-03-01,8,9\n"))
        corrected_data = correct_data_formats(csv_data)
        self.assertTrue(pd.api.types.is_datetime64_any_dtype(corrected_data['date']))  # Check if 'date' is datetime

    def test_sanitize_metadata_value(self):
        self.assertEqual(sanitize_metadata_value("test\nvalue\r"), "test value ")

    def test_preprocess_data_with_duplicates(self):
        csv_data = pd.read_csv(io.StringIO("col1,col2,col3\n1,2,3\n1,2,3\n7,8,9\n"))
        options = {
            "dropDuplicates": True,
            "dropColumns": [],
            "fillNa": "drop",
            "enableAnomalyDetection": False
        }
        processed_data, report, stats = preprocess_data(csv_data, options)
        self.assertIn("Removed 1 duplicate rows", report)
        self.assertEqual(stats["duplicateRows"], 1)

    def test_fill_missing_values_custom(self):
        csv_data = pd.read_csv(io.StringIO("col1,col2,col3\n1,,3\n4,5,6\n7,8,\n"))
        filled_data = fill_missing_values(csv_data, "fill", "custom", 0)
        self.assertFalse(filled_data.isnull().values.any())  # No missing values
        self.assertTrue((filled_data == 0).any().any())  # Custom value filled

    def test_preprocess_data_with_errors(self):
        csv_data = pd.read_csv(io.StringIO("col1,col2\n1,2\n4,5\n7,8\n"))  # Missing col3
        options = {
            "dropDuplicates": False,
            "dropColumns": ["col3"],
            "fillNa": "drop",
            "enableAnomalyDetection": True
        }
        with self.assertRaises(Exception) as context:
            preprocess_data(csv_data, options)
        self.assertTrue('Error in detecting anomalies' in str(context.exception))

if __name__ == "__main__":
    unittest.main()
