# Lambda Function Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the two Lambda functions for AquaFlow AI water analytics:

1. **leak-detector-3am.py** - Daily 3AM leak detection (scheduled via CloudWatch Events)
2. **realtime-excessive-water-alert.py** - Realtime excessive usage alerts (triggered by Kinesis stream)

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Python 3.9 or later
- IAM role with the following permissions:
  - Lambda execution
  - Timestream query
  - DynamoDB read/write
  - SES send email
  - Kinesis stream read

## Step 1: Create IAM Role for Lambda Functions

### Option A: AWS Management Console

1. Go to IAM > Roles > Create role
2. Select "AWS Lambda" as the service
3. Attach these policies:
   - `AWSLambdaBasicExecutionRole`
   - `AmazonTimestreamQueryFullAccess`
   - `AmazonDynamoDBFullAccess`
   - `AmazonSESFullAccess`
   - `AmazonKinesisFullAccess`
4. Name the role: `aquaflow-lambda-execution-role`
5. Note the ARN (e.g., `arn:aws:iam::123456789:role/aquaflow-lambda-execution-role`)

### Option B: AWS CLI

```bash
# Create trust policy
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name aquaflow-lambda-execution-role \
  --assume-role-policy-document file://trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name aquaflow-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
  --role-name aquaflow-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonTimestreamQueryFullAccess

aws iam attach-role-policy \
  --role-name aquaflow-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

aws iam attach-role-policy \
  --role-name aquaflow-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess

aws iam attach-role-policy \
  --role-name aquaflow-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonKinesisFullAccess
```

## Step 2: Deploy Lambda Function 1 - 3AM Leak Detector

### Package the function

```bash
# Clone repository
git clone https://github.com/HarriKrishnaa/aquaflow-water-analytics-dynamic.git
cd aquaflow-water-analytics-dynamic

# Create deployment package
cd lambda
zip -r ../leak-detector-3am.zip leak-detector-3am.py
cd ..
```

### Deploy to AWS Lambda

```bash
aws lambda create-function \
  --function-name aquaflow-leak-detector-3am \
  --runtime python3.9 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/aquaflow-lambda-execution-role \
  --handler leak-detector-3am.lambda_handler \
  --zip-file fileb://lambda/leak-detector-3am.zip \
  --timeout 300 \
  --memory-size 256 \
  --region us-east-1
```

### Create CloudWatch Events trigger (3:15 AM UTC daily)

```bash
# Create CloudWatch Events rule
aws events put-rule \
  --name aquaflow-3am-leak-detection \
  --schedule-expression "cron(15 3 * * ? *)" \
  --state ENABLED

# Add Lambda as target
aws events put-targets \
  --rule aquaflow-3am-leak-detection \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:aquaflow-leak-detector-3am"

# Grant CloudWatch permission to invoke Lambda
aws lambda add-permission \
  --function-name aquaflow-leak-detector-3am \
  --statement-id AllowCloudWatchInvoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:YOUR_ACCOUNT_ID:rule/aquaflow-3am-leak-detection
```

## Step 3: Deploy Lambda Function 2 - Realtime Excessive Water Alert

### Package the function

```bash
# Create deployment package
cd lambda
zip -r ../realtime-excessive-water-alert.zip realtime-excessive-water-alert.py
cd ..
```

### Deploy to AWS Lambda

```bash
aws lambda create-function \
  --function-name aquaflow-realtime-excessive-alert \
  --runtime python3.9 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/aquaflow-lambda-execution-role \
  --handler realtime-excessive-water-alert.lambda_handler \
  --zip-file fileb://lambda/realtime-excessive-water-alert.zip \
  --timeout 60 \
  --memory-size 512 \
  --region us-east-1
```

### Create Kinesis Stream trigger

```bash
# Create event source mapping (Kinesis -> Lambda)
aws lambda create-event-source-mapping \
  --event-source-arn arn:aws:kinesis:us-east-1:YOUR_ACCOUNT_ID:stream/water-consumption-stream \
  --function-name aquaflow-realtime-excessive-alert \
  --enabled \
  --batch-size 10 \
  --starting-position LATEST
```

## Step 4: Configure SES for Email Notifications

### Verify sender email address

```bash
aws ses verify-email-identity \
  --email-address noreply@aquaflow.com \
  --region us-east-1
```

### Check SES sandbox status

```bash
aws ses get-account-sending-enabled --region us-east-1
```

**Note:** If in SES Sandbox, you must verify all recipient email addresses:

```bash
aws ses verify-email-identity \
  --email-address owner-a101@example.com \
  --region us-east-1

aws ses verify-email-identity \
  --email-address manager@aquaflow.com \
  --region us-east-1
```

## Step 5: Configure Environment Variables

### Update Lambda function environment

```bash
# 3AM Leak Detector
aws lambda update-function-configuration \
  --function-name aquaflow-leak-detector-3am \
  --environment Variables="{
    TIMESTREAM_DATABASE=water_analytics,
    TIMESTREAM_TABLE=flat_consumption,
    DYNAMODB_TABLE=water_alerts,
    SES_SENDER=noreply@aquaflow.com
  }" \
  --region us-east-1

# Realtime Excessive Alert
aws lambda update-function-configuration \
  --function-name aquaflow-realtime-excessive-alert \
  --environment Variables="{
    KINESIS_STREAM=water-consumption-stream,
    DYNAMODB_TABLE=water_alerts,
    EXCESSIVE_THRESHOLD=300,
    SES_SENDER=noreply@aquaflow.com,
    BUILDING_MANAGER_EMAIL=manager@aquaflow.com
  }" \
  --region us-east-1
```

## Step 6: Test Lambda Functions

### Test 3AM Leak Detector

```bash
aws lambda invoke \
  --function-name aquaflow-leak-detector-3am \
  --payload '{}' \
  response.json \
  --region us-east-1

cat response.json
```

### Test Realtime Excessive Alert

```bash
aws lambda invoke \
  --function-name aquaflow-realtime-excessive-alert \
  --payload '{
    "Records": [
      {
        "kinesis": {
          "data": "eyJmbGF0SWQiOiAiQS0xMDEiLCAiY29uc3VtcHRpb24iOiA0NTAsICJ0aW1lc3RhbXAiOiAiMjAyNC0wMy0wN1QxNDowMDowMFoifQ=="
        }
      }
    ]
  }' \
  response.json \
  --region us-east-1

cat response.json
```

## Step 7: Monitor Lambda Execution

### View CloudWatch Logs

```bash
# 3AM Leak Detector logs
aws logs tail /aws/lambda/aquaflow-leak-detector-3am --follow

# Realtime Excessive Alert logs
aws logs tail /aws/lambda/aquaflow-realtime-excessive-alert --follow
```

### Check Lambda Metrics

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=aquaflow-leak-detector-3am \
  --start-time 2024-03-01T00:00:00Z \
  --end-time 2024-03-08T00:00:00Z \
  --period 86400 \
  --statistics Sum
```

## Step 8: Update Lambda Function Code

### After making changes

```bash
# Package updated code
cd lambda
zip -r ../leak-detector-3am-updated.zip leak-detector-3am.py

# Update function code
aws lambda update-function-code \
  --function-name aquaflow-leak-detector-3am \
  --zip-file fileb://../leak-detector-3am-updated.zip \
  --region us-east-1
```

## Troubleshooting

### Lambda Timeout
- Increase timeout: `--timeout 300` (max 900 seconds)
- Optimize Timestream queries
- Check DynamoDB throttling

### SES Email Not Sending
- Verify sender email is verified in SES
- Check SES sandbox status
- Verify recipient emails if in sandbox
- Check IAM role has `AmazonSESFullAccess`

### Kinesis Event Mapping Not Working
- Verify Kinesis stream exists
- Check stream has data
- Verify Lambda has Kinesis read permissions
- Check event source mapping status: `aws lambda list-event-source-mappings --function-name aquaflow-realtime-excessive-alert`

### Timestream Query Errors
- Verify database and table exist
- Check Timestream has data
- Verify IAM role has `AmazonTimestreamQueryFullAccess`
- Test query in Timestream console

## Security Best Practices

✅ Use IAM roles with least privilege
✅ Enable Lambda encryption at rest
✅ Use VPC endpoints for AWS services
✅ Enable CloudTrail logging
✅ Rotate SES credentials regularly
✅ Use environment variables for secrets (not hardcoded)
✅ Enable Lambda concurrency limits
✅ Monitor CloudWatch logs for errors

## Production Deployment Checklist

- [ ] IAM role created with correct permissions
- [ ] Both Lambda functions deployed
- [ ] CloudWatch Events trigger configured for 3AM
- [ ] Kinesis event mapping created
- [ ] SES verified and tested
- [ ] CloudWatch alarms set up
- [ ] Lambda concurrency limits configured
- [ ] VPC configured (if needed)
- [ ] CloudTrail enabled for audit logging
- [ ] All email addresses verified in SES
- [ ] Timeout and memory settings optimized
- [ ] Error handling and retry logic tested
- [ ] Lambda function versions/aliases created
- [ ] Blue-green deployment strategy planned
- [ ] Rollback procedure documented
