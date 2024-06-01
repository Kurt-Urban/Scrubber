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

        # Save Processed File with Report as Metadata
        output_buffer = io.BytesIO()
        processed_data.to_csv(output_buffer, index=False)
        output_buffer.seek(0)
        s3.put_object(
            Bucket=bucket_name, 
            Key='processed_' + file_key, 
            Body=output_buffer, 
            Metadata={'processing_report': report}
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'processed_file_key': 'processed_' + file_key
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
        # Drop duplicates
        if options.get('dropDuplicates', False):
            data.drop_duplicates(inplace=True)
            report.append("Removed duplicates")
        
        # Drop specified columns
        if 'dropColumns' in options:
            data.drop(columns=options['dropColumns'], inplace=True)
            report.append(f"Dropped columns: {', '.join(options['dropColumns'])}")

        # Fill missing values
        fill_na = options.get('fillNa', 'none')
        if fill_na != 'none':
            fill_custom_na_value = options.get('fillCustomNaValue', None)
            fill_na_value = options.get('fillNaValue', None)
            data = fill_missing_values(data, fill_na, fill_na_value, fill_custom_na_value)
            report.append(f"Filled missing values using {fill_na} method")

        return data, "\n".join(report)
    except Exception as e:
        raise Exception(f"Error in preprocessing data: {str(e)}")

def fill_missing_values(data, fill_na, fill_na_value, fill_custom_na_value):
    try:
        if fill_na == 'drop':
            data.dropna(inplace=True)
        elif fill_na == 'fill':
            if fill_na_value == 'mean':
                data.fillna(data.mean(), inplace=True)
            elif fill_na_value == 'median':
                data.fillna(data.median(), inplace=True)
            elif fill_na_value == 'mode':
                data.fillna(data.mode().iloc[0], inplace=True)
            elif fill_na_value == 'backwards':
                data.fillna(method='bfill', inplace=True)
            elif fill_na_value == 'custom' and fill_custom_na_value is not None:
                data.fillna(fill_custom_na_value, inplace=True)
            else:
                raise ValueError("Invalid fillNaValue provided.")
        return data
    except Exception as e:
        raise Exception(f"Error in filling missing values: {str(e)}")

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
