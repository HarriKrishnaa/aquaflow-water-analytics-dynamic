import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

# AWS SDK clients
kinesis_client = boto3.client('kinesis')
dynamodb_client = boto3.client('dynamodb')
ses_client = boto3.client('ses')

# Configuration
KINESIS_STREAM = 'water-consumption-stream'
DYNAMODB_TABLE = 'water_alerts'
EXCESSIVE_THRESHOLD = 300  # L/hr - 3x normal baseline of ~100
SES_SENDER = 'noreply@aquaflow.com'
BUILDING_MANAGER_EMAIL = 'harrikrishnaa@gmail.com'

def lambda_handler(event, context):
    """
    Lambda function for REALTIME Excessive Water Alert
    
    Triggered by Kinesis Data Stream records
    Monitors LIVE consumption and sends immediate alerts for excessive usage
    Detects consumption spikes >3x normal baseline (threshold: 300 L/hr)
    """
    
    print(f"🚨 Starting Realtime Excessive Water Alert at {datetime.utcnow()}")
    
    try:
        alerts_sent = 0
        anomalies_detected = []
        
        # Process Kinesis records (real-time stream data)
        for record in event.get('Records', []):
            payload = json.loads(record['kinesis']['data'])
            
            flat_id = payload.get('flatId')
            current_consumption = float(payload.get('consumption', 0))
            timestamp = payload.get('timestamp')
            
            # Check if consumption exceeds excessive threshold
            if current_consumption > EXCESSIVE_THRESHOLD:
                anomaly = {
                    'flatId': flat_id,
                    'consumption': current_consumption,
                    'threshold': EXCESSIVE_THRESHOLD,
                    'timestamp': timestamp,
                    'severity': 'CRITICAL' if current_consumption > 500 else 'HIGH',
                    'percentageOverThreshold': round((current_consumption - EXCESSIVE_THRESHOLD) / EXCESSIVE_THRESHOLD * 100, 2)
                }
                
                anomalies_detected.append(anomaly)
                
                # Send immediate SES alert
                email_sent = send_immediate_alert(anomaly)
                if email_sent:
                    alerts_sent += 1
                
                # Store in DynamoDB for dashboard
                update_dynamodb_anomaly(anomaly)
                
                print(f"🚨 EXCESSIVE USAGE ALERT: {flat_id} - {current_consumption} L/hr")
        
        print(f"✅ Processed {len(event.get('Records', []))} records, {alerts_sent} alerts sent")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Realtime excessive water alert processed',
                'recordsProcessed': len(event.get('Records', [])),
                'alertsSent': alerts_sent,
                'anomaliesDetected': anomalies_detected,
                'timestamp': datetime.utcnow().isoformat()
            })
        }
    
    except Exception as e:
        print(f"❌ Error in excessive water alert: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def send_immediate_alert(anomaly):
    """
    Send IMMEDIATE email alert for excessive consumption
    """
    
    try:
        flat_id = anomaly['flatId']
        consumption = anomaly['consumption']
        severity = anomaly['severity']
        percentage_over = anomaly['percentageOverThreshold']
        
        # Get flat owner email (mock - would query from database)
        owner_email = get_flat_owner_email(flat_id)
        
        subject = f"🚨 CRITICAL: EXCESSIVE WATER USAGE - Unit {flat_id}"
        
        html_body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .alert {{ background-color: #ff4444; color: white; padding: 20px; }}
                .metric {{ font-size: 18px; font-weight: bold; }}
            </style>
        </head>
        <body>
            <h2 style="color: #ff4444;">⚠️ EXCESSIVE WATER USAGE ALERT</h2>
            <div class="alert">
                <p><strong>Flat/Unit:</strong> {flat_id}</p>
                <p><strong>Severity Level:</strong> {severity}</p>
                <p><strong>Current Usage:</strong> <span class="metric">{consumption} L/hr</span></p>
                <p><strong>Alert Threshold:</strong> {EXCESSIVE_THRESHOLD} L/hr</p>
                <p><strong>Exceeds Threshold By:</strong> {percentage_over}%</p>
                <p><strong>Time:</strong> {anomaly.get('timestamp', 'N/A')}</p>
            </div>
            
            <hr>
            <h3>Immediate Actions Required:</h3>
            <ul>
                <li>⏸️ Stop all water-using appliances (washing machine, dishwasher, etc.)</li>
                <li>🔍 Check for visible water leaks and running toilets</li>
                <li>🚿 Close all taps and shower valves</li>
                <li>📞 Contact building management immediately if leak is confirmed</li>
                <li>🔧 Request emergency plumber inspection</li>
            </ul>
            
            <hr>
            <p style="color: #666; font-size: 12px;">
                This is an automated real-time alert from AquaFlow AI Water Analytics System.<br>
                Building Manager: {BUILDING_MANAGER_EMAIL}<br>
                Alert generated at {datetime.utcnow().isoformat()}
            </p>
        </body>
        </html>
        """
        
        text_body = f"""
CRITICAL: EXCESSIVE WATER USAGE ALERT

Flat/Unit: {flat_id}
Severity: {severity}
Current Usage: {consumption} L/hr
Threshold: {EXCESSIVE_THRESHOLD} L/hr
Exceeds By: {percentage_over}%

IMMEDIATE ACTIONS:
1. Stop all water-using appliances
2. Check for leaks and running toilets
3. Contact building management
4. Request plumber inspection

Time: {anomaly.get('timestamp', 'N/A')}

- AquaFlow AI System
        """
        
        # Send to flat owner
        ses_client.send_email(
            Source=SES_SENDER,
            Destination={'ToAddresses': [owner_ema, 'harrikrishnaa@gmail.com]}l]},
            Message={
                'Subject': {'Data': subject},
                'Body': {
                    'Html': {'Data': html_body},
                    'Text': {'Data': text_body}
                }
            }
        )
        
        # CC building manager
        ses_client.send_email(
            Source=SES_SENDER,
            Destination={'ToAddresses': [BUILDING_MANAGER_EMAIL]},
            Message={
                'Subject': {'Data': f"[BUILDING ALERT] {subject}"},
                'Body': {
                    'Html': {'Data': f"<p>Unit {flat_id} detected excessive usage of {consumption} L/hr</p>" + html_body},
                    'Text': {'Data': text_body}
                }
            }
        )
        
        print(f"✅ Email alert sent to {owner_email} and {BUILDING_MANAGER_EMAIL}")
        return True
    
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        return False

def get_flat_owner_email(flat_id):
    """
    Get flat owner email from flat ID
    """
    
    flat_owner_map = {
        'A-101': 'owner-a101@example.com',
        'A-102': 'owner-a102@example.com',
        'A-103': 'owner-a103@example.com',
        'B-201': 'owner-b201@example.com',
        'B-202': 'owner-b202@example.com',
        'B-203': 'owner-b203@example.com',
        'C-301': 'owner-c301@example.com',
        'C-302': 'owner-c302@example.com'
    }
    
    return flat_owner_map.get(flat_id, BUILDING_MANAGER_EMAIL)

def update_dynamodb_anomaly(anomaly):
    """
    Store excessive water usage anomaly in DynamoDB for real-time dashboard
    """
    
    try:
        flat_id = anomaly['flatId']
        
        item = {
            'flatId': {'S': flat_id},
            'alertKey': {'S': 'excessive_usage'},
            'status': {'S': 'active'},
            'consumption': {'N': str(anomaly['consumption'])},
            'threshold': {'N': str(anomaly['threshold'])},
            'severity': {'S': anomaly['severity']},
            'lastAlert': {'S': anomaly['timestamp']},
            'percentageOver': {'N': str(anomaly['percentageOverThreshold'])},
            'ttl': {'N': str(int(datetime.utcnow().timestamp()) + 3600)}  # 1 hour TTL
        }
        
        dynamodb_client.put_item(
            TableName=DYNAMODB_TABLE,
            Item=item
        )
        
        print(f"✅ DynamoDB updated for {flat_id}")
    
    except Exception as e:
        print(f"❌ Error updating DynamoDB: {str(e)}")

if __name__ == '__main__':
    # For local testing
    test_event = {
        'Records': [
            {
                'kinesis': {
                    'data': json.dumps({
                        'flatId': 'A-101',
                        'consumption': 450,
                        'timestamp': datetime.utcnow().isoformat()
                    }).encode('utf-8')
                }
            }
        ]
    }
    result = lambda_handler(test_event, {})
    print(json.dumps(json.loads(result['body']), indent=2))
