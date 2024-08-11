# Project Scrubber

_Penn State Software Engineering Capstone Project by Kurt Urban & Kofi Shang_

## General Description

Project Scrubber is a web application designed to automate and simplify the process of cleaning CSV files. Leveraging modern cloud technologies, it provides users with a robust online service where they can upload their data files, automatically correct common issues such as duplicates and formatting errors, and download the cleaned data.

## Technology Stack

- **Frontend:** React.js
- **Backend:** Node.js with Express.js
- **Data Processing:** AWS Lambda, Python, Pandas, DBSCAN
- **Storage:** AWS S3
- **CI/CD:** GitHub Actions, Pulumi
- **Logging & Monitoring:** AWS Lambda Powertools (Logger, Metrics, Tracer)
- **Testing:** Jest, React Testing Library, Pytest, SAM

### Prerequisites

To set up and run Project Scrubber locally, you need to have the following installed:

- Node.js (version 20 or higher)
- Yarn
- Python 3.11
- AWS CLI configured with appropriate credentials
- Pulumi CLI
  - Pulumi CLI is used to deploy the AWS infrastructure. You can install it by following the instructions [here](https://www.pulumi.com/docs/get-started/install/).
  - The Pulumi File used for this project is highly customized with various hard coded configurations. Should you wish to deploy the infrastructure, you will need to modify the Pulumi file to suit your needs.

## Getting Started

1. **Clone the repository:**

   ```sh
   git clone https://github.com/Kurt-Urban/Scrubber.git

   cd project-scrubber
   ```

2. **Install dependencies:**
   ```sh
   yarn install
   ```
3. **Start the frontend:**
   ```sh
   yarn start:frontend
   ```
4. **Start the backend:**

   ```sh
   yarn watch:backend

   yarn start:backend
   ```

5. **Open your browser and navigate to `http://localhost:3000` to view the app.**

6. **Lambda Function:**

   Replace the file_key in event.json with a local file path and run the following command to test the lambda function.

   ```sh
   cd packages/lambda

   pip install -r requirements.txt

   sam local invoke -e event.json
   ```
