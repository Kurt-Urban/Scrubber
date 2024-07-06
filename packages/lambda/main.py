import json
import boto3
import pandas as pd
import io
from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit

logger = Logger(service="file_processor_service")
metrics = Metrics(namespace="FileProcessorNamespace", service="file_processor_service")
tracer = Tracer(service="file_processor_service")

@logger.inject_lambda_context
@metrics.log_metrics
@tracer.capture_lambda_handler
def lambda_handler(event, context):
    logger.info("Lambda function started")
    try:
        # Print event for debugging
        logger.info(f"Event received: {json.dumps(event, indent=2)}")

        s3 = boto3.client("s3")

        # Hardcode bucket names
        source_bucket_name = "scrubber-user-uploads"
        destination_bucket_name = "scrubber-processed-files"
        file_key = event["file_key"]
        cleaning_options = event["cleaning_options"]

        # Read File
        obj = s3.get_object(Bucket=source_bucket_name, Key=file_key)
        data = pd.read_csv(io.BytesIO(obj["Body"].read()))

        # Preprocess Data and Generate Statistics Report
        processed_data, report, stats = preprocess_data(data, cleaning_options)

        # Sanitize the report for metadata
        sanitized_report = sanitize_metadata_value(report)

        # Save Processed File with Report and Statistics as Metadata
        output_buffer = io.BytesIO()
        processed_data.to_csv(output_buffer, index=False)
        output_buffer.seek(0)
        processed_file_key = "processed_" + file_key
        s3.put_object(
            Bucket=destination_bucket_name,
            Key=processed_file_key,
            Body=output_buffer,
            Metadata={
                "processing_report": sanitized_report,
                "totalRows": str(stats["totalRows"]),
                "duplicateRows": str(stats["duplicateRows"]),
                "modifiedRows": str(stats["modifiedRows"]),
                "corruptedRows": str(stats["corruptedRows"]),
            },
        )

        # Custom metrics
        metrics.add_metric(name="InvocationCount", unit=MetricUnit.Count, value=1)
        metrics.add_metric(name="SuccessCount", unit=MetricUnit.Count, value=1)
        
        logger.info("Lambda function succeeded")
        return {
            "statusCode": 200,
            "body": json.dumps({"processed_file_key": processed_file_key}),
        }

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        
        # Custom metrics
        metrics.add_metric(name="ErrorCount", unit=MetricUnit.Count, value=1)
        
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

def sanitize_metadata_value(value):
    """Sanitize metadata value to be a valid HTTP header value."""
    return value.replace('\n', ' ').replace('\r', ' ')

def preprocess_data(data, options):
    try:
        initial_rows = len(data)
        report = []
        stats = {"totalRows": initial_rows, "duplicateRows": 0, "modifiedRows": 0, "corruptedRows": 0}
        
        # Example preprocessing steps
        if options.get("removeDuplicates", False):
            before_duplicates = len(data)
            data = data.drop_duplicates()
            after_duplicates = len(data)
            stats["duplicateRows"] = before_duplicates - after_duplicates
            report.append("Removed duplicate rows")
        
        if options.get("fillNa", False):
            fill_na = options.get("fillNa")
            fill_custom_na_value = options.get("fillCustomNaValue", None)
            fill_na_value = options.get("fillNaValue", None)
            before_fillna = len(data)
            data = fill_missing_values(
                data, fill_na, fill_na_value, fill_custom_na_value
            )
            after_fillna = len(data.dropna())
            stats["modifiedRows"] = before_fillna - after_fillna
            report.append(f"Filled missing values using {fill_na} method")

        stats["corruptedRows"] = initial_rows - len(data)
        return data, "\n".join(report), stats
    except Exception as e:
        raise Exception(f"Error in preprocessing data: {str(e)}")

def fill_missing_values(data, fill_na, fill_na_value, fill_custom_na_value):
    try:
        if fill_na == "drop":
            data.dropna(inplace=True)
        elif fill_na == "fill":
            if fill_na_value == "mean":
                data.fillna(data.mean(), inplace=True)
            elif fill_na_value == "median":
                data.fillna(data.median(), inplace=True)
            elif fill_na_value == "mode":
                data.fillna(data.mode().iloc[0], inplace=True)
            elif fill_na_value == "backwards":
                data.fillna(method="bfill", inplace=True)
            elif fill_na_value == "custom" and fill_custom_na_value is not None:
                data.fillna(fill_custom_na_value, inplace=True)
            else:
                raise ValueError("Invalid fillNaValue provided.")
        return data
    except Exception as e:
        raise Exception(f"Error in filling missing values: {str(e)}")

def correct_data_formats(data):
    try:
        for column in data.select_dtypes(include=["object"]).columns:
            try:
                data[column] = pd.to_datetime(data[column])
            except (ValueError, TypeError):
                pass

        return data
    except Exception as e:
        raise Exception(f"Error in correcting data formats: {str(e)}")