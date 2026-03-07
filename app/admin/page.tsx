'use client';
import { useEffect, useState } from 'react';

interface LeakAlert {
  flatId: string;
  alertKey: string;
  nightFlow: number;
  severity: string;
  status: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [leaks, setLeaks] = useState<LeakAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaks();
  }, []);

  const fetchLeaks = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_ALERTS_API_URL || '');
      const data = await response.json();
      setLeaks(data.filter((leak: LeakAlert) => leak.severity === 'LEAK'));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaks:', error);
      setLoading(false);
    }
  };

  const sendEmail = async (flatId: string, nightFlow: number) => {
    setSending(flatId);
    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flatId, nightFlow })
      });
      const result = await response.json();
      alert(result.message || 'Email sent successfully!');
    } catch (error) {
      alert('Failed to send email');
    } finally {
      setSending(null);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#0a0e27', minHeight: '100vh', color: 'white' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '20px', color: '#00d9ff' }}>💧 Admin Dashboard - Leak Alerts</h1>
      
      {loading ? (
        <p>Loading leak data...</p>
      ) : (
        <div style={{ backgroundColor: '#1a1f3a', borderRadius: '8px', padding: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #00d9ff' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Flat ID</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Night Flow (L)</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Severity</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Detected On</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {leaks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>
                    No leak alerts found
                  </td>
                </tr>
              ) : (
                leaks.map((leak) => (
                  <tr key={leak.flatId + leak.alertKey} style={{ borderBottom: '1px solid #2a2f4a' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#ff6b6b' }}>{leak.flatId}</td>
                    <td style={{ padding: '12px' }}>{leak.nightFlow}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ backgroundColor: '#ff4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {leak.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: leak.status === 'active' ? '#4ade80' : '#94a3b8' }}>
                      {leak.status}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.9rem', color: '#94a3b8' }}>
                      {new Date(leak.timestamp).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => sendEmail(leak.flatId, leak.nightFlow)}
                        disabled={sending === leak.flatId}
                        style={{
                          backgroundColor: sending === leak.flatId ? '#6b7280' : '#00d9ff',
                          color: '#0a0e27',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: sending === leak.flatId ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {sending === leak.flatId ? 'Sending...' : '📧 Send Email'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#1a1f3a', borderRadius: '8px' }}>
        <h3 style={{ color: '#00d9ff', marginBottom: '10px' }}>📊 Summary</h3>
        <p>Total Active Leak Alerts: <strong style={{ color: '#ff6b6b' }}>{leaks.length}</strong></p>
        <p>Data Source: AWS DynamoDB (Learners Lab)</p>
      </div>
    </div>
  );
}
