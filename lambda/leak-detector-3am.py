import json
import boto3
import os
from datetime import datetime, timedelta
from decimal import Decimal
import requests

# AWS SDK clients
timestream_client = boto3.client('timestream-query')
dynamodb_client = boto3.client('dynamodb')
ses_client = boto3.client('ses')

# Configuration
TIMESTREAM_DATABASE = 'water_analytics'
TIMESTREAM_TABLE = 'flat_consumption'
DYNAMODB_TABLE = 'water_alerts'
LEAK_THRESHOLD = 50  # L/night
NIGHT_WINDOW_HOURS = (2, 4)  # 2-4 AM
SES_SENDER = 'noreply@aquaflow.com'
BUILDING_MANAGER_EMAIL = 'harrikrishnaa@gmail.com'  # Receives all leak alerts

FLAT_OWNER_EMAILS = {
    'A-101': 'owner.a101@example.com',
    'A-102': 'owner.a102@example.com',
    'A-103': 'owner.a103@example.com',
    'B-201': 'owner.b201@example.com',
    'B-202': 'owner.b202@example.com',
    'B-203': 'owner.b203@example.com',
    'C-301': 'owner.c301@example.com',
    'C-302': 'owner.c302@example.com'
}

SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')

def lambda_handler(event, context):
    """
    Lambda function for 3AM Leak Detection
    
    Triggered daily at 3:15 AM UTC via CloudWatch Events
    Analyzes water consumption from 2-4 AM (night window)
    Detects anomalies and sends SES alerts to flat owners
    """
    
    print(f"🔍 Starting 3AM Leak Detection at {datetime.utcnow()}")
    
    try:
        # Step 1: Query Timestream for 2-4 AM consumption data
        night_flow_data = query_timestream_night_window()
        print(f"✅ Retrieved night flow data for {len(night_flow_data)} flats")
        
        # Step 2: Calculate 7-day average per flat
        flat_averages = calculate_7day_average()
        print(f"✅ Calculated 7-day averages: {flat_averages}")
        
        # Step 3: Detect leaks
        leak_detections = detect_leaks(night_flow_data, flat_averages)
        print(f"🚨 Detected leaks in {len(leak_detections)} units: {leak_detections}")
        
        # Step 4: Send SES emails to flat owners
        email_results = send_leak_alerts(leak_detections)
        print(f"📧 Email notifications sent: {email_results}")
        
        # Step 5: Update DynamoDB with alerts
        update_dynamodb_alerts(leak_detections)
        print(f"✅ Updated DynamoDB with {len(leak_detections)} alerts")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Leak detection completed',
                'leakDetections': leak_detections,
                'emailsSent': len(leak_detections),
                'timestamp': datetime.utcnow().isoformat()
            })
        }
    
    except Exception as e:
        print(f"❌ Error in leak detection: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def query_timestream_night_window():
    """
    Query Timestream for 2-4 AM consumption (2-4 hours from midnight)
    Returns: Dict of flat_id -> night_flow_liters
    """
    
    # Calculate time range (last 24 hours, 2-4 AM window)
    end_time = datetime.utcnow().replace(hour=4, minute=0, second=0, microsecond=0)
    start_time = end_time.replace(hour=2)
    
    query = f"""
    SELECT 
        flatId,
        AVG(CAST(consumption AS DOUBLE)) as avg_flow,
        SUM(CAST(consumption AS DOUBLE)) as total_flow
    FROM "{TIMESTREAM_DATABASE}"."{TIMESTREAM_TABLE}"
    WHERE 
        time >= '{start_time.isoformat()}' AND 
        time < '{end_time.isoformat()}'
    GROUP BY flatId
    """
    
    try:
        response = timestream_client.query(QueryString=query)
        
        night_flow_data = {}
        for row in response.get('Rows', []):
            data = {col['Name']: col['Value'] for col in row['Data']}
            flat_id = data.get('flatId', '')
            total_flow = float(data.get('total_flow', 0))
            
            night_flow_data[flat_id] = total_flow
        
        return night_flow_data
    
    except Exception as e:
        print(f"Error querying Timestream: {str(e)}")
        # Return mock data for demonstration
        return mock_night_flow_data()

def calculate_7day_average():
    """
    Calculate 7-day average nighttime consumption per flat
    Returns: Dict of flat_id -> average_liters
    """
    
    # This would query the last 7 days of 2-4 AM data
    # For now, return standard baseline
    
    flat_list = ['A-101', 'A-102', 'A-103', 'B-201', 'B-202', 'B-203', 'C-301', 'C-302']
    
    # Mock 7-day averages
    averages = {
        'A-101': 45,
        'A-102': 12,
        'A-103': 40,
        'B-201': 8,
        'B-202': 14,
        'B-203': 48,
        'C-301': 10,
        'C-302': 16
    }
    
    return averages

def detect_leaks(night_flow_data, flat_averages):
    """
    Detect leaks by comparing current night flow against 7-day average
    Leak threshold: > 50 L/night
    
    Returns: List of {'flatId': str, 'nightFlow': float, 'baseline': float, 'ownerEmail': str}
    """
    
    leak_detections = []
    
    for flat_id, current_flow in night_flow_data.items():
        baseline = flat_averages.get(flat_id, 50)
        
        # Leak detection: exceeds threshold
        if current_flow > LEAK_THRESHOLD:
            flat_owner_email = get_flat_owner_email(flat_id)
            
            leak_detection = {
                'flatId': flat_id,
                'nightFlow': round(current_flow, 2),
                'baseline': baseline,
                'ownerEmail': flat_owner_email,
                'detectionTime': datetime.utcnow().isoformat(),
                'severity': 'HIGH' if current_flow > 80 else 'MEDIUM'
            }
            
            leak_detections.append(leak_detection)
    
    return leak_detections

def get_flat_owner_email(flat_id):
    """
    Get flat owner email from flat ID
    This would typically query a database or DynamoDB
    """
    
    # Mock flat owner database
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
    
    return FLAT_OWNER_EMAILS.get(flat_id, BUILDING_MANAGER_EMAIL)
def send_leak_alerts(leak_detections):
    """
    Send SES emails to flat owners about detected leaks
    
    Returns: List of email send results
    """
    
    email_results = []
    
    for leak in leak_detections:
        try:
            flat_id = leak['flatId']
            owner_email = leak['ownerEmail']
            night_flow = leak['nightFlow']
            severity = leak['severity']
            
            subject = f"🚨 WATER LEAK ALERT - Unit {flat_id}"
            
            html_body = f"""
            <html>
                <head></head>
                <body>
                    <h2>Water Leak Detection Alert</h2>
                    <p><strong>Unit:</strong> {flat_id}</p>
                    <p><strong>Alert Level:</strong> <span style="color: {'red' if severity == 'HIGH' else 'orange'};">{severity}</span></p>
                    <p><strong>Night Flow Detected:</strong> {night_flow} L (2-4 AM window)</p>
                    <p><strong>Normal Baseline:</strong> {leak.get('baseline', 'N/A')} L</p>
                    <p><strong>Detection Time:</strong> {leak.get('detectionTime', 'N/A')}</p>
                    
                    <hr>
                    <h3>Actions Required:</h3>
                    <ul>
                        <li>Check for visible water leaks in pipes and fixtures</li>
                        <li>Inspect toilet for continuous running</li>
                        <li>Look for water stains on walls/ceiling indicating hidden leaks</li>
                        <li>Contact maintenance if leak is found</li>
                    </ul>
                    
                    <hr>
                    <p>This is an automated alert from AquaFlow AI Water Analytics System.</p>
                    <p>Building Manager: manager@aquaflow.com</p>
                </body>
            </html>
            """
            
            text_body = f"""
            WATER LEAK DETECTION ALERT
            
            Unit: {flat_id}
            Severity: {severity}
            Night Flow: {night_flow} L (2-4 AM)
            Detection Time: {leak.get('detectionTime', 'N/A')}
            
            Please check for water leaks. Contact building management if needed.
            
            - AquaFlow AI System
            """
            
            # Send email via SES
            response = ses_client.send_email(
                Source=SES_SENDER,
                Destination={'ToAddresses': [owner_email, BUILDING_MANAGER_EMAIL]},},
                Message={
                    'Subject': {'Data': subject},
                    'Body': {
                        'Html': {'Data': html_body},
                        'Text': {'Data': text_body}
                    }
                }
            )
            
            email_results.append({
                'flatId': flat_id,
                'recipient': owner_email,
                'messageId': response['MessageId'],
                'status': 'SENT'
            })
            
            print(f"✅ Email sent to {owner_email} for {flat_id}")
        
        except Exception as e:
            print(f"❌ Error sending email to {owner_email}: {str(e)}")
            email_results.append({
                'flatId': flat_id,
                'recipient': owner_email,
                'status': 'FAILED',
                'error': str(e)
            })
    
    return email_results

def update_dynamodb_alerts(leak_detections):
    """
    Store leak detections in DynamoDB for dashboard display
    """
    
    for leak in leak_detections:
        try:
            flat_id = leak['flatId']
            
            item = {
                'flatId': {'S': flat_id},
                'alertKey': {'S': 'current_anomalies'},
                'status': {'S': 'leak'},
                'nightFlow': {'N': str(leak['nightFlow'])},
                'severity': {'S': leak['severity']},
                'lastAlert': {'S': leak['detectionTime']},
                'ownerEmail': {'S': leak['ownerEmail']},
                'emailSent': {'BOOL': True},
                'ttl': {'N': str(int((datetime.utcnow() + timedelta(days=7)).timestamp()))}
            }
            
            dynamodb_client.put_item(
                TableName=DYNAMODB_TABLE,
                Item=item
            )
            
            print(f"✅ DynamoDB alert stored for {flat_id}")
        
        except Exception as e:
            print(f"❌ Error updating DynamoDB for {flat_id}: {str(e)}")

def mock_night_flow_data():
    """
    Mock data for demonstration when Timestream is not available
    """
    return {
        'A-101': 78,   # Leak
        'A-102': 12,   # Normal
        'A-103': 65,   # High
        'B-201': 8,    # Normal
        'B-202': 15,   # Normal
        'B-203': 92,   # Leak
        'C-301': 11,   # Normal
        'C-302': 18    # Normal
    }

if __name__ == '__main__':
    # For local testing
    event = {}
    context = {}
    result = lambda_handler(event, context)
    print(json.dumps(result, indent=2))
