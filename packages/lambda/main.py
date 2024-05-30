import json
import boto3
import pandas as pd
import io

def lambda_handler(event, context):
    try:
        bucket_name = event['bucket']
        file_key = event['file_key']
        cleaning_options = event['cleaning_options']

        # Read File
        s3 = boto3.client('s3')
        obj = s3.get_object(Bucket=bucket_name, Key=file_key)
        data = pd.read_csv(io.BytesIO(obj['Body'].read()))

        # Preprocess Data
        processed_data, report = preprocess_data(data, cleaning_options)

        # Save Processed File
        output_buffer = io.BytesIO()
        processed_data.to_csv(output_buffer, index=False)
        output_buffer.seek(0)
        s3.put_object(Bucket=bucket_name, Key='processed_' + file_key, Body=output_buffer)

        # Save Report
        report_key = 'report_' + file_key.replace('.csv', '.txt')
        s3.put_object(Bucket=bucket_name, Key=report_key, Body=report)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'processed_file_key': 'processed_' + file_key,
                'report_file_key': report_key
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }

def preprocess_data(data, options):
    report = []
    try:
        if 'remove_duplicates' in options:
            data.drop_duplicates(inplace=True)
            report.append("Removed duplicates")

        if 'correct_data_formats' in options:
            data = correct_data_formats(data)
            report.append("Corrected data formats")

        if 'fill_missing_values' in options:
            data = fill_missing_values(data)
            report.append("Filled missing values")

        return data, "\n".join(report)
    except Exception as e:
        raise Exception(f"Error in preprocessing data: {str(e)}")

def correct_data_formats(data):
    try:
        for column in data.select_dtypes(include=['object']).columns:
            try:
                data[column] = pd.to_datetime(data[column])
            except (ValueError, TypeError):
                pass

        return data
    except Exception as e:
        raise Exception(f"Error in correcting data formats: {str(e)}")

def fill_missing_values(data):
    try:
        for column in data.columns:
            if data[column].dtype == 'object':
                data[column].fillna('missing', inplace=True)
            else:
                data[column].fillna(data[column].mean(), inplace=True)

        return data
    except Exception as e:
        raise Exception(f"Error in filling missing values: {str(e)}")
