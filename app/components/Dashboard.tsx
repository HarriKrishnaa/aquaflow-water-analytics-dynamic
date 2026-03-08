'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './Dashboard.module.css';

interface FlowData {
  timestamp: string;
  flatId: string;
  consumption: number;
  baseline: number;
  isLeak: boolean;
}

interface AnomalyData {
  flatId: string;
  nightFlow: number;
  status: 'normal' | 'high' | 'leak';
  lastAlert: string;
}

interface ChartDataPoint {
  time: string;
  value: number;
  baseline: number;
}

export default function Dashboard() {
  const [liveMetrics, setLiveMetrics] = useState({
    totalConsumption: 713,
    trend: '+12%',
    anomalyCount: 0,
    leakDetections: 0,
    timestamp: new Date().toLocaleTimeString(),
    totalFlats: 8
  });

  const [chartData, setChartData] = useState<ChartDataPoint[]>([
    { time: '00:00', value: 520, baseline: 500 },
    { time: '04:00', value: 380, baseline: 450 },
    { time: '08:00', value: 680, baseline: 550 },
    { time: '12:00', value: 750, baseline: 600 },
    { time: '16:00', value: 820, baseline: 650 },
    { time: '20:00', value: 713, baseline: 550 }
  ]);

  const [unitData, setUnitData] = useState<AnomalyData[]>([
    { flatId: 'A-101', nightFlow: 78, status: 'leak', lastAlert: '3h ago' },
    { flatId: 'A-102', nightFlow: 12, status: 'normal', lastAlert: 'None' },
    { flatId: 'A-103', nightFlow: 65, status: 'high', lastAlert: '1h ago' },
    { flatId: 'B-201', nightFlow: 8, status: 'normal', lastAlert: 'None' },
    { flatId: 'B-202', nightFlow: 15, status: 'normal', lastAlert: 'None' },
    { flatId: 'B-203', nightFlow: 92, status: 'leak', lastAlert: '30m ago' },
    { flatId: 'C-301', nightFlow: 11, status: 'normal', lastAlert: 'None' },
    { flatId: 'C-302', nightFlow: 18, status: 'normal', lastAlert: 'None' }
  ]);
   const [showApartmentsModal, setShowApartmentsModal] = useState(false);

  // Fetch data from AWS backend
  useEffect(() => {
    const fetchAWSData = async () => {
      try {
        // Fetch from API Gateway -> Lambda -> Timestream, DynamoDB, etc.
        const response = await fetch('/api/water-metrics', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          setLiveMetrics(prev => ({
            ...prev,
            totalConsumption: data.totalConsumption || 713,
            anomalyCount: data.anomalyCount || 0,
            leakDetections: data.leakDetections || 0,
            totalFlats: data.totalFlats || unitData.length,
            timestamp: new Date().toLocaleTimeString()
          }));
          if (data.chartData) setChartData(data.chartData);
          if (data.unitData) setUnitData(data.unitData);
        }
      } catch (error) {
        console.log('Using mock data - Backend not yet configured');
      }
    };
    fetchAWSData();
    const interval = setInterval(fetchAWSData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Real-time updates simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        totalConsumption: prev.totalConsumption + Math.floor(Math.random() * 20 - 10),
        trend: `+${(10 + Math.random() * 5).toFixed(1)}%`,
        anomalyCount: Math.floor(Math.random() * 5),
        leakDetections: Math.floor(Math.random() * 3),
        timestamp: new Date().toLocaleTimeString()
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const leakUnits = unitData.filter(u => u.status === 'leak');
  const highConsumption = unitData.filter(u => u.status === 'high' || u.status === 'leak');

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1>💧 AquaFlow AI - Real-Time Analytics</h1>
          <div className={styles.liveIndicator}>
            <span className={styles.pulse}></span>
            LIVE • {liveMetrics.timestamp}
          </div>
        </div>
      </header>
      
      {/* Leak Alert Notification Banner */}
      {leakUnits.length > 0 && (
        <div style={{
          backgroundColor: '#ff4444',
          padding: '16px 20px',
          margin: '0',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #ff0000'
        }}>
          <span>
            🚨 ALERT: {leakUnits.length} Active Leak{leakUnits.length > 1 ? 's' : ''} Detected! 
            Immediate action required.
          </span>
          <a href="/admin" style={{
            backgroundColor: 'white',
            color: '#ff4444',
            padding: '8px 16px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>
            View Admin Dashboard →
          </a>
        </div>
      )}

      {/* Key Metrics */}
      <section className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>💧</div>
          <div className={styles.metricContent}>
            <h3>Total Consumption</h3>
            <p className={styles.metricValue}>{liveMetrics.totalConsumption} L/hr</p>
            <span className={styles.trendPositive}>{liveMetrics.trend} vs last hour</span>
          </div>
        </div>
        <div className={styles.metricCard + ' ' + styles.alert}>
          <div className={styles.metricIcon}>🚨</div>
          <div className={styles.metricContent}>
            <h3>Active Anomalies</h3>
            <p className={styles.metricValue}>{liveMetrics.anomalyCount} Units</p>
            <span className={styles.trendNegative}>ACTION REQUIRED</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>⚠️</div>
          <div className={styles.metricContent}>
            <h3>Leak Detection (3AM)</h3>
            <p className={styles.metricValue}>{liveMetrics.leakDetections} Flats</p>
            <span className={styles.trendWarning}>Lambda Triggered</span>
          </div>
        </div>
        <div className={styles.metricCard} onClick={() => setShowApartmentsModal(true)} style={{ cursor: 'pointer' }}>
          <div className={styles.metricIcon}>🏢</div>
          <div className={styles.metricContent}>
            <h3>Total Apartments</h3>
            <p className={styles.metricValue}>{liveMetrics.totalFlats}</p>
            <span className={styles.trendPositive}>All Units Connected</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>📊</div>
          <div className={styles.metricContent}>
            <h3>Pipeline Status</h3>
            <p className={styles.metricValue}>✓ ACTIVE</p>
            <span className={styles.trendPositive}>All Services Running</span>
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className={styles.chartsGrid}>
        <div className={styles.chartContainer}>
          <h2>📈 Real-time Consumption Trend (24h)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="time" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00d4ff' }} />
              <Legend />
              <Line type="monotone" dataKey="baseline" stroke="#888" name="Baseline" />
              <Line type="monotone" dataKey="value" stroke="#00d4ff" strokeWidth={3} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.chartContainer}>
          <h2>🏢 Unit-wise Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={unitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="flatId" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00d4ff' }} />
              <Bar dataKey="nightFlow" fill="#00d4ff" name="Night Flow (L)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Leak Detection Insights */}
      <section className={styles.insights}>
        <h2>🔍 3AM Leak Detection Insights</h2>
        <div className={styles.insightGrid}>
          <div className={styles.insightCard}>
            <h3>Detected Leaks</h3>
            <p className={styles.largeNumber}>{leakUnits.length}</p>
            <ul className={styles.leakList}>
              {leakUnits.map(unit => (
                <li key={unit.flatId}>
                  <span className={styles.flatBadge}>{unit.flatId}</span>
                  <span>{unit.nightFlow}L/night</span>
                  <span className={styles.alert}>⚠️ LEAK</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.insightCard}>
            <h3>High Usage Units</h3>
            <p className={styles.largeNumber}>{highConsumption.length}</p>
            <ul className={styles.leakList}>
              {highConsumption.map(unit => (
                <li key={unit.flatId}>
                  <span className={styles.flatBadge}>{unit.flatId}</span>
                  <span>{unit.nightFlow}L/night</span>
                  <span className={styles.warning}>⚠️ HIGH</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.insightCard}>
            <h3>Cost Impact Analysis</h3>
            <div className={styles.costMetrics}>
              <div>
                <span className={styles.costLabel}>Monthly Water Loss:</span>
                <span className={styles.costValue}>{(leakUnits.reduce((sum, u) => sum + u.nightFlow, 0) * 30).toLocaleString()} L</span>
              </div>
              <div>
                <span className={styles.costLabel}>Potential Savings:</span>
                <span className={styles.costValue + ' ' + styles.positive}>₹{(leakUnits.length * 500).toLocaleString()}</span>
              </div>
              <div>
                <span className={styles.costLabel}>Detection Accuracy:</span>
                <span className={styles.costValue}>98.5%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
     {/* Apartments List Modal */}
     {showApartmentsModal && (
       <div style={{
         position: 'fixed',
         top: 0,
         left: 0,
         right: 0,
         bottom: 0,
         backgroundColor: 'rgba(0, 0, 0, 0.7)',
         display: 'flex',
         justifyContent: 'center',
         alignItems: 'center',
         zIndex: 1000
       }}>
         <div style={{
           backgroundColor: '#0a0e27',
           borderRadius: '8px',
           border: '2px solid #00d4ff',
           padding: '30px',
           maxWidth: '600px',
           width: '90%',
           maxHeight: '80vh',
           overflowY: 'auto',
           boxShadow: '0 0 30px rgba(0, 212, 255, 0.3)'
         }}>
           <div style={{
             display: 'flex',
             justifyContent: 'space-between',
             alignItems: 'center',
             marginBottom: '20px'
           }}>
             <h2 style={{ color: '#00d4ff', margin: 0 }}>🏢 All Apartments ({liveMetrics.totalFlats})</h2>
             <button
               onClick={() => setShowApartmentsModal(false)}
               style={{
                 background: 'none',
                 border: 'none',
                 fontSize: '24px',
                 color: '#00d4ff',
                 cursor: 'pointer',
                 padding: 0
               }}
             >
               ✕
             </button>
           </div>
           
           <div style={{
             display: 'grid',
             gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
             gap: '15px'
           }}>
             {unitData.map((unit) => (
               <div
                 key={unit.flatId}
                 style={{
                   backgroundColor: unit.status === 'leak' ? '#ff4444' : unit.status === 'high' ? '#ff9500' : '#1a1a2e',
                   border: '2px solid ' + (unit.status === 'leak' ? '#ff0000' : unit.status === 'high' ? '#ff6600' : '#00d4ff'),
                   borderRadius: '8px',
                   padding: '15px',
                   textAlign: 'center',
                   color: 'white'
                 }}
               >
                 <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4ff' }}>
                   {unit.flatId}
                 </div>
                 <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                   {unit.nightFlow}L/night
                 </div>
                 <div style={{ fontSize: '11px', marginTop: '4px', color: unit.status === 'normal' ? '#00d4ff' : '#ffff00' }}>
                   {unit.status === 'leak' ? '⚠️ LEAK' : unit.status === 'high' ? '⚠️ HIGH' : '✓ NORMAL'}
                 </div>
               </div>
             ))}
           </div>
           
           <button
             onClick={() => setShowApartmentsModal(false)}
             style={{
               width: '100%',
               marginTop: '20px',
               padding: '12px',
               backgroundColor: '#00d4ff',
               color: '#0a0e27',
               border: 'none',
               borderRadius: '4px',
               fontWeight: 'bold',
               cursor: 'pointer',
               fontSize: '16px'
             }}
           >
             Close
           </button>
         </div>
       </div>
     )}
    </div>
  );
}
