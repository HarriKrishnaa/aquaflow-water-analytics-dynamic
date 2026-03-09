# Vercel Deployment Guide - AquaFlow Water Analytics

## Overview
This guide provides step-by-step instructions for deploying the AquaFlow water analytics dashboard to Vercel with full AWS integration (API Gateway, IoT Core, DynamoDB, Lambda, SES).

## Prerequisites

- GitHub account with repository access
- Vercel account (vercel.com)
- AWS credentials and configuration
- Node.js 18+ installed locally

## Step 1: Prepare Repository

Ensure all changes are committed to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Connect to Vercel

### Option A: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select "Import an existing project"
4. Authorize GitHub and select: `aquaflow-water-analytics-dynamic`
5. Click "Import"

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Step 3: Configure Environment Variables

In Vercel Dashboard, go to **Settings > Environment Variables** and add:

### AWS API Gateway Configuration
```
REACT_APP_API_ENDPOINT=https://00eifrlm0i.execute-api.us-east-1.amazonaws.com
AWS_REGION=us-east-1
```

### AWS IoT Core Configuration
```
AWS_IOT_ENDPOINT=a1234567890abc-ats.iot.us-east-1.amazonaws.com
AWS_IOT_TOPIC_PREFIX=aquaflow/sensors
```

### AWS Credentials (Optional - if using SDK directly)
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### Application Configuration
```
NEXT_PUBLIC_APP_NAME=AquaFlow Water Analytics
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_LOG_LEVEL=info
```

## Step 4: Configure Build Settings

In Vercel Dashboard, go to **Settings > Build & Development**:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

## Step 5: Set CORS Headers (for AWS API Gateway)

Create or update `vercel.json` in project root:

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
        }
      ]
    }
  ]
}
```

## Step 6: Configure AWS API Gateway CORS

In AWS Console > API Gateway > aquaflow-water-api:

1. Click **CORS** in left sidebar
2. Click **Enable CORS**
3. Add your Vercel domain:
   - `https://aquaflow-water-analytics-dynamic.vercel.app`
4. Select methods: GET, POST, PUT, DELETE, OPTIONS
5. Click **Save**

## Step 7: Trigger Deployment

### Automatic Deployment (GitHub Integration)
Any push to `main` branch will automatically trigger a deployment:

```bash
git push origin main  # Triggers automatic Vercel deployment
```

### Manual Deployment
In Vercel Dashboard:
1. Go to your project
2. Click **Deployments**
3. Click **Redeploy** on latest deployment OR
4. Use Vercel CLI: `vercel --prod`

## Step 8: Verify Deployment

After deployment completes:

1. Check deployment logs in Vercel Dashboard
2. Visit your Vercel URL (e.g., `https://aquaflow-water-analytics-dynamic.vercel.app`)
3. Test API endpoints:

```bash
# Test AWS API Gateway integration
curl https://aquaflow-water-analytics-dynamic.vercel.app/api/water-metrics

# Test IoT Core integration
curl "https://aquaflow-water-analytics-dynamic.vercel.app/api/iot-core?action=list-devices"
```

## Step 9: Monitor and Debug

### View Logs
In Vercel Dashboard:
1. Go to **Deployments**
2. Click on deployment
3. Click **Logs** tab

### Common Issues & Solutions

#### 503 Service Unavailable
- Verify AWS API Gateway endpoint is active
- Check CORS configuration in API Gateway
- Verify environment variables in Vercel

#### CORS Errors
- Ensure vercel.json has correct headers
- Add Vercel domain to API Gateway CORS
- Check browser console for specific CORS error

#### API Timeout
- Check Lambda function timeout settings
- Verify DynamoDB table exists and has correct permissions
- Check CloudWatch logs in AWS

## Step 10: Production Monitoring

### Enable Vercel Analytics
1. Go to **Settings > Analytics**
2. Enable Web Analytics
3. Set up performance budgets

### Set Up Error Tracking
1. Go to **Settings > Environment**
2. Configure error notifications

### CloudWatch Monitoring (AWS)
```bash
# View API Gateway logs
aws logs tail /aws/apigateway/aquaflow-water-api --follow

# View Lambda logs
aws logs tail /aws/lambda/aquaflow-leak-detector-3am --follow
```

## Rollback Deployment

If deployment has issues:

1. Go to **Deployments** in Vercel
2. Find previous working deployment
3. Click **Promote to Production**
4. Or use: `vercel rollback --prod`

## Customization Options

### Custom Domain
1. Go to **Settings > Domains**
2. Click **Add Domain**
3. Follow instructions to add custom domain
4. Update AWS API Gateway CORS with custom domain

### Serverless Function Configuration
Edit `next.config.js` to customize:
- Region
- Memory allocation
- Timeout settings

## Performance Optimization

### Image Optimization
Next.js Image component is pre-configured for optimal delivery.

### Edge Caching
Vercel automatically caches static assets at edge locations.

### Incremental Static Regeneration (ISR)
Configure ISR in pages if needed:

```typescript
export const revalidate = 60; // Revalidate every 60 seconds
```

## Security Best Practices

- ✅ Never commit AWS credentials (use environment variables)
- ✅ Enable HTTPS (automatic with Vercel)
- ✅ Configure firewall rules in Vercel
- ✅ Enable 2FA on Vercel account
- ✅ Use IAM roles instead of access keys (AWS)
- ✅ Rotate credentials regularly

## Support & Troubleshooting

For deployment issues:

1. Check [Vercel Deployment Documentation](https://vercel.com/docs)
2. Review [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
3. Check AWS API Gateway [Logs and Monitoring](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html)
4. Check [AquaFlow Repository Issues](https://github.com/HarriKrishnaa/aquaflow-water-analytics-dynamic/issues)

## Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Water metrics data displays correctly
- [ ] IoT device list loads
- [ ] API Gateway endpoints respond (status 200)
- [ ] Environment variables are set correctly
- [ ] AWS services are accessible
- [ ] CORS is working (no browser errors)
- [ ] Monitoring/Analytics are enabled
- [ ] Custom domain is configured (if applicable)
- [ ] SSL certificate is valid
- [ ] Deployment logs show no errors
- [ ] Performance is acceptable (<3s page load)

## Rollback to Previous Version

If current deployment has critical issues:

```bash
# Using Vercel CLI
vercel list  # See all deployments
vercel rollback prod  # Rollback to previous production version
```

Or in Dashboard:
1. **Deployments** tab
2. Find previous stable version
3. Click three dots (...)
4. Select **Promote to Production**

---

**Deployment URL**: https://aquaflow-water-analytics-dynamic.vercel.app

**Last Updated**: March 9, 2026
**Version**: 1.0.0
