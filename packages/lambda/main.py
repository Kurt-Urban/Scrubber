import json
import boto3
import pandas as pd
import io
from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from sklearn.cluster import DBSCAN
import numpy as np

logger = Logger(service="file_processor_service")
metrics = Metrics(namespace="FileProcessorNamespace", service="file_processor_service")
tracer = Tracer(service="file_processor_service")

s3 = boto3.client("s3")

@logger.inject_lambda_context
@metrics.log_metrics
@tracer.capture_lambda_handler
def lambda_handler(event, context):
    logger.info("Lambda function started")
    try:
        logger.info(f"Event received: {json.dumps(event, indent=2)}")
        source_bucket_name = "scrubber-user-uploads"
        destination_bucket_name = "scrubber-processed-files"
        file_key = event["file_key"]
        cleaning_options = event["cleaning_options"]

        logger.info(f"Reading file from S3: {source_bucket_name}/{file_key}")
        data = read_csv_from_s3(source_bucket_name, file_key)
        logger.info("File read successfully")

        logger.info("Preprocessing data")
        processed_data, report, stats = preprocess_data(data, cleaning_options)
        logger.info("Data preprocessing completed")

        sanitized_report = sanitize_metadata_value(report)

        processed_file_key = "processed_" + file_key
        logger.info(f"Saving processed file to S3: {destination_bucket_name}/{processed_file_key}")
        write_csv_to_s3(processed_data, destination_bucket_name, processed_file_key, sanitized_report, stats)
        logger.info("Processed file saved successfully")

        metrics.add_metric(name="InvocationCount", unit=MetricUnit.Count, value=1)
        metrics.add_metric(name="SuccessCount", unit=MetricUnit.Count, value=1)
        
        logger.info("Lambda function succeeded")
        return {
            "statusCode": 200,
            "body": json.dumps({"processed_file_key": processed_file_key}),
        }

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        metrics.add_metric(name="ErrorCount", unit=MetricUnit.Count, value=1)
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

def read_csv_from_s3(bucket_name, file_key):
    try:
        obj = s3.get_object(Bucket=bucket_name, Key=file_key)
        return pd.read_csv(io.BytesIO(obj["Body"].read()))
    except Exception as e:
        logger.error(f"Error in reading CSV from S3: {str(e)}")
        raise Exception("S3 error")

def write_csv_to_s3(data, bucket_name, file_key, report, stats):
    try:
        output_buffer = io.BytesIO()
        data.to_csv(output_buffer, index=False)
        output_buffer.seek(0)
        s3.put_object(
            Bucket=bucket_name,
            Key=file_key,
            Body=output_buffer,
            Metadata={
                "processing_report": report,
                "totalRows": str(stats["totalRows"]),
                "duplicateRows": str(stats["duplicateRows"]),
                "modifiedRows": str(stats["modifiedRows"]),
                "corruptedRows": str(stats["corruptedRows"]),
                "anomalousRows": str(stats["anomalousRows"]),
            },
        )
    except Exception as e:
        logger.error(f"Error in writing CSV to S3: {str(e)}")
        raise Exception("S3 error")

def sanitize_metadata_value(value):
    return value.replace('\n', ' ').replace('\r', ' ')

def preprocess_data(data, options):
    try:
        initial_rows = len(data)
        report = []
        stats = {"totalRows": initial_rows, "duplicateRows": 0, "modifiedRows": 0, "corruptedRows": 0, "anomalousRows": 0}
        
        if options.get("dropDuplicates", False):
            logger.info("Removing duplicate rows")
            before_duplicates = len(data)
            data = data.drop_duplicates()
            after_duplicates = len(data)
            stats["duplicateRows"] = before_duplicates - after_duplicates
            report.append(f"Removed {stats['duplicateRows']} duplicate rows")
            logger.info(f"Removed {stats['duplicateRows']} duplicate rows")

        if "dropColumns" in options:
            columns_to_drop = options["dropColumns"]
            data.drop(columns=columns_to_drop, inplace=True, errors='ignore')
            report.append(f"Dropped columns: {', '.join(columns_to_drop)}")
            logger.info(f"Dropped columns: {', '.join(columns_to_drop)}")
        
        if options.get("fillNa", False):
            fill_na = options.get("fillNa")
            fill_custom_na_value = options.get("fillCustomNaValue", None)
            fill_na_value = options.get("fillNaValue", None)
            logger.info(f"Filling missing values using {fill_na} method")
            before_fillna = len(data)
            data = fill_missing_values(
                data, fill_na, fill_na_value, fill_custom_na_value
            )
            after_fillna = len(data.dropna())
            stats["modifiedRows"] = before_fillna - after_fillna
            report.append(f"Filled missing values using {fill_na} method")
            logger.info(f"Filled missing values using {fill_na} method")

        if options.get("enableAnomalyDetection", False):
            logger.info("Detecting anomalies using DBSCAN")
            anomalous_data, num_anomalies = detect_anomalies(data)
            data = anomalous_data
            stats["anomalousRows"] = num_anomalies
            report.append(f"Detected {num_anomalies} anomalous rows using DBSCAN")
            logger.info(f"Detected {num_anomalies} anomalous rows using DBSCAN")

        stats["corruptedRows"] = initial_rows - len(data)
        logger.info("Preprocessing complete")
        return data, "\n".join(report), stats
    except Exception as e:
        logger.error(f"Error in preprocessing data: {str(e)}")
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
        logger.info(f"Filled missing values successfully with method {fill_na} and value {fill_na_value}")
        return data
    except Exception as e:
        logger.error(f"Error in filling missing values: {str(e)}")
        raise Exception(f"Error in filling missing values: {str(e)}")

def detect_anomalies(data):
    try:
        data_for_clustering = data.select_dtypes(include=[np.number]).dropna()
        dbscan = DBSCAN(eps=0.5, min_samples=5)
        clusters = dbscan.fit_predict(data_for_clustering)
        data['anomaly'] = (clusters == -1).astype(int)
        num_anomalies = sum(clusters == -1)
        logger.info(f"Anomalies detected: {num_anomalies}")
        return data, num_anomalies
    except Exception as e:
        logger.error(f"Error in detecting anomalies: {str(e)}")
        raise Exception(f"Error in detecting anomalies: {str(e)}")

def correct_data_formats(data):
    try:
        for column in data.select_dtypes(include=["object"]).columns:
            try:
                data[column] = pd.to_datetime(data[column])
            except (ValueError, TypeError):
                pass
        logger.info("Corrected data formats successfully")
        return data
    except Exception as e:
        logger.error(f"Error in correcting data formats: {str(e)}")
        raise Exception(f"Error in correcting data formats: {str(e)}")
