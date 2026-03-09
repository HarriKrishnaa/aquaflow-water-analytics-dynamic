# AWS API Gateway Integration Guide

## Overview
This document provides instructions for integrating the AquaFlow frontend with the AWS API Gateway backend.

## API Gateway Details

**API Endpoint:** `https://00eifrlm0i.execute-api.us-east-1.amazonaws.com`

**API ID:** `00eifrlm0i`

**Region:** `us-east-1`

**Status:** ✅ Active

## Environment Variables

To use the AWS API Gateway integration, add the following environment variables to your `.env.local` file:

```env
# AWS API Gateway Configuration
REACT_APP_API_ENDPOINT=https://00eifrlm0i.execute-api.us-east-1.amazonaws.com
AWS_REGION=us-east-1
```

## Deployment Instructions

### 1. Local Development

```bash
# Install dependencies
npm install

# Create .env.local with AWS credentials
echo "REACT_APP_API_ENDPOINT=https://00eifrlm0i.execute-api.us-east-1.amazonaws.com" > .env.local
echo "AWS_REGION=us-east-1" >> .env.local

# Start development server
npm run dev
```

### 2. Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Go to **Settings > Environment Variables**
3. Add the following variables:
   - `REACT_APP_API_ENDPOINT`: `https://00eifrlm0i.execute-api.us-east-1.amazonaws.com`
   - `AWS_REGION`: `us-east-1`
4. Deploy to production

## API Endpoints

The frontend communicates with the AWS API Gateway through the following endpoints:

### GET /water-metrics
Fetch real-time water consumption data and anomaly alerts.

**Query Parameters:**
- `flatId` (optional): Filter by specific flat ID
- `timeRange` (optional): Time range for data (default: '24h')

**Example:**
```bash
GET https://00eifrlm0i.execute-api.us-east-1.amazonaws.com/water-metrics?flatId=A-101&timeRange=24h
```

**Response:**
```json
{
  "timestamp": "2024-03-09T18:00:00Z",
  "totalConsumption": 713,
  "anomalyCount": 2,
  "leakDetections": 1,
  "chartData": [...],
  "unitData": [...],
  "awsServices": {...},
  "pipelineStatus": "Production Ready"
}
```

### POST /water-metrics
Send actions to trigger Lambda functions or send alerts.

**Request Body:**
```json
{
  "action": "trigger-leak-detection" | "send-alert",
  "data": {
    // Action-specific data
  }
}
```

## Error Handling

The frontend has built-in error handling:

- **503 Service Unavailable**: AWS API Gateway endpoint is not responding
  - The frontend will automatically provide fallback mock data
  - Check AWS API Gateway status in AWS Console

- **500 Server Error**: Backend processing error
  - Check AWS Lambda and DynamoDB logs in CloudWatch

## Troubleshooting

### API Endpoint Returns 404
- Verify the API Gateway is deployed and active
- Check AWS API Gateway settings in AWS Console
- Confirm the endpoint URL matches the deployment

### CORS Issues
- Ensure API Gateway has CORS enabled for your domain
- Check Cross-Origin Resource Sharing (CORS) configuration in API Gateway

### Lambda Function Errors
- Check CloudWatch Logs for detailed error messages
- Verify IAM permissions for Lambda execution role
- Test Lambda functions directly in AWS Console

## Frontend Code Changes

The main integration happens in `app/api/water-metrics/route.ts`:

```typescript
// AWS API Gateway Configuration
const AWS_API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://00eifrlm0i.execute-api.us-east-1.amazonaws.com';

// GET handler fetches data from AWS API Gateway
export async function GET(request: NextRequest) {
  const apiUrl = new URL(AWS_API_ENDPOINT);
  const response = await fetch(apiUrl.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  // ... handle response
}
```

## Production Checklist

- [ ] Environment variables are set in Vercel
- [ ] API Gateway endpoint is active and responding
- [ ] CORS is configured for your Vercel domain
- [ ] Lambda functions are deployed and tested
- [ ] DynamoDB tables are created and accessible
- [ ] CloudWatch alarms are configured
- [ ] Monitoring and logging are enabled

## Support

For issues or questions about the AWS integration:
1. Check CloudWatch logs in AWS Console
2. Review the API Gateway request/response logs
3. Test endpoints using curl or Postman
4. Open an issue in the GitHub repository

## References

- [AWS API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
