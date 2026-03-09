import { NextRequest, NextResponse } from 'next/server';

// AWS API Gateway Configuration
const AWS_API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://00eifrlm0i.execute-api.us-east-1.amazonaws.com';
const API_REGION = process.env.AWS_REGION || 'us-east-1';

// Type definitions for API responses
interface WaterMetricsResponse {
  timestamp: string;
  totalConsumption: number;
  anomalyCount: number;
  leakDetections: number;
  chartData: Array<{ time: string; value: number; baseline: number }>;
  unitData: Array<{ flatId: string; nightFlow: number; status: string; lastAlert: string }>;
  awsServices: {
    iotCore: string;
    kinesisStream: string;
    timestream: string;
    dynamodb: string;
    lambda3AM: string;
    sesNotifications: string;
  };
  pipelineStatus: string;
  updateInterval: number;
}

// GET handler - Fetch water metrics from AWS API Gateway
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Query parameters for filtering
    const { searchParams } = new URL(request.url);
    const flatId = searchParams.get('flatId') || '';
    const timeRange = searchParams.get('timeRange') || '24h';

    // Build the AWS API Gateway URL
    const apiUrl = new URL(AWS_API_ENDPOINT);
    apiUrl.pathname = '/water-metrics';
    if (flatId) apiUrl.searchParams.append('flatId', flatId);
    apiUrl.searchParams.append('timeRange', timeRange);

    console.log(`[WATER-METRICS API] Calling AWS API Gateway: ${apiUrl.toString()}`);

    // Make request to AWS API Gateway
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Forwarded-Proto': 'https',
        'User-Agent': 'AquaFlow-Frontend/1.0'
      },
      cache: 'no-store'
    });

    // Handle AWS API Gateway response
    if (!response.ok) {
      console.error(`[WATER-METRICS API] AWS API Gateway returned status: ${response.status}`);
      
      // If AWS API fails, return graceful error with fallback data
      if (response.status === 404) {
        console.warn('[WATER-METRICS API] AWS endpoint returned 404 - API may not be deployed yet');
        return NextResponse.json(
          {
            error: 'AWS API endpoint not available',
            message: 'The AWS API Gateway endpoint is not currently active. Please ensure the backend is deployed.',
            fallbackData: generateFallbackData(flatId, timeRange)
          },
          { status: 503, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      
      throw new Error(`AWS API returned ${response.status}: ${response.statusText}`);
    }

    const data: WaterMetricsResponse = await response.json();
    
    console.log('[WATER-METRICS API] Successfully retrieved data from AWS API Gateway');

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
        'X-Source': 'AWS-API-Gateway'
      }
    });
  } catch (error) {
    console.error('[WATER-METRICS API] Error:', error instanceof Error ? error.message : error);
    
    // Return fallback data on error
    return NextResponse.json(
      {
        error: 'Failed to fetch water metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallbackData: generateFallbackData('', '24h')
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  }
}

// POST handler - Send requests to AWS Lambda or SES through API Gateway
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    // Build the AWS API Gateway URL for POST requests
    const apiUrl = new URL(AWS_API_ENDPOINT);
    apiUrl.pathname = '/water-metrics';
    apiUrl.searchParams.append('action', action);

    console.log(`[WATER-METRICS API] POST to AWS API Gateway with action: ${action}`);

    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Forwarded-Proto': 'https',
        'User-Agent': 'AquaFlow-Frontend/1.0'
      },
      body: JSON.stringify({
        action,
        data,
        timestamp: new Date().toISOString(),
        source: 'frontend'
      })
    });

    if (!response.ok) {
      console.error(`[WATER-METRICS API] AWS API Gateway POST returned status: ${response.status}`);
      throw new Error(`AWS API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log(`[WATER-METRICS API] Successfully sent ${action} request to AWS API Gateway`);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
        'X-Source': 'AWS-API-Gateway'
      }
    });
  } catch (error) {
    console.error('[WATER-METRICS API] POST Error:', error instanceof Error ? error.message : error);
    
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

// Fallback data generator - used when AWS API is unavailable
function generateFallbackData(flatId: string, timeRange: string): WaterMetricsResponse {
  return {
    timestamp: new Date().toISOString(),
    totalConsumption: 713 + Math.floor(Math.random() * 50 - 25),
    anomalyCount: Math.floor(Math.random() * 5),
    leakDetections: Math.floor(Math.random() * 3),
    chartData: [
      { time: '00:00', value: 520, baseline: 500 },
      { time: '04:00', value: 380, baseline: 450 },
      { time: '08:00', value: 680, baseline: 550 },
      { time: '12:00', value: 750, baseline: 600 },
      { time: '16:00', value: 820, baseline: 650 },
      { time: '20:00', value: 713, baseline: 550 }
    ],
    unitData: [
      { flatId: 'A-101', nightFlow: 78, status: 'leak', lastAlert: '3h ago' },
      { flatId: 'A-102', nightFlow: 12, status: 'normal', lastAlert: 'None' },
      { flatId: 'A-103', nightFlow: 65, status: 'high', lastAlert: '1h ago' },
      { flatId: 'B-201', nightFlow: 8, status: 'normal', lastAlert: 'None' },
      { flatId: 'B-202', nightFlow: 15, status: 'normal', lastAlert: 'None' },
      { flatId: 'B-203', nightFlow: 92, status: 'leak', lastAlert: '30m ago' },
      { flatId: 'C-301', nightFlow: 11, status: 'normal', lastAlert: 'None' },
      { flatId: 'C-302', nightFlow: 18, status: 'normal', lastAlert: 'None' }
    ],
    awsServices: {
      iotCore: 'ACTIVE',
      kinesisStream: 'ACTIVE',
      timestream: 'ACTIVE',
      dynamodb: 'ACTIVE',
      lambda3AM: 'ACTIVE',
      sesNotifications: 'READY'
    },
    pipelineStatus: 'Fallback Mode - AWS API Unavailable',
    updateInterval: 5000
  };
}




// ✅ Health check query: Use GET /api/water-metrics to monitor connection status
// Response includes: totalConsumption, anomalyCount, leakDetections, AWS pipeline status
// If connection fails, fallback data is automatically provided for UI stability
