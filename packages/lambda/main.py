import json
import boto3
import pandas as pd
import io


def lambda_handler(event, context):
    try:
        # Print event for debugging
        print("Event received:", json.dumps(event, indent=2))

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
                "processing_report": report,
                "totalRows": str(stats["totalRows"]),
                "duplicateRows": str(stats["duplicateRows"]),
                "modifiedRows": str(stats["modifiedRows"]),
                "corruptedRows": str(stats["corruptedRows"]),
            },
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"processed_file_key": processed_file_key}),
        }

    except Exception as e:
        print("Error:", str(e))
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}


def preprocess_data(data, options):
    report = []
    stats = {
        "totalRows": len(data),
        "duplicateRows": 0,
        "modifiedRows": 0,
        "corruptedRows": 0,
    }

    try:
        initial_rows = len(data)

        # Drop duplicates
        if options.get("dropDuplicates", False):
            before_dedup = len(data)
            data.drop_duplicates(inplace=True)
            stats["duplicateRows"] = before_dedup - len(data)
            report.append("Removed duplicates")

        # Drop specified columns if the list is longer than 0
        if "dropColumns" in options and len(options["dropColumns"]) > 0:
            columns_to_drop = options["dropColumns"]
            data.drop(columns=columns_to_drop, inplace=True, errors="ignore")
            report.append(f"Dropped columns: {', '.join(columns_to_drop)}")

        # Fill missing values
        fill_na = options.get("fillNa", "none")
        if fill_na != "none":
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
