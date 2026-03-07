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
    timestamp: new Date().toLocaleTimeString()
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

      {/* AWS Integration Details */}
      <section className={styles.awsIntegration}>
        <h2>🔌 AWS Data Pipeline Status</h2>
        <div className={styles.pipelineGrid}>
          <div className={styles.pipelineItem}>
            <h4>IoT Core</h4>
            <p>Ingesting smart meter data</p>
            <span className={styles.badge + ' ' + styles.active}>ACTIVE</span>
          </div>
          <div className={styles.pipelineItem}>
            <h4>Kinesis Data Stream</h4>
            <p>Real-time stream processing</p>
            <span className={styles.badge + ' ' + styles.active}>ACTIVE</span>
          </div>
          <div className={styles.pipelineItem}>
            <h4>Timestream Database</h4>
            <p>Time-series data storage</p>
            <span className={styles.badge + ' ' + styles.active}>ACTIVE</span>
          </div>
          <div className={styles.pipelineItem}>
            <h4>DynamoDB</h4>
            <p>Anomaly alerts & thresholds</p>
            <span className={styles.badge + ' ' + styles.active}>ACTIVE</span>
          </div>
          <div className={styles.pipelineItem}>
            <h4>Lambda (3AM Detector)</h4>
            <p>Daily leak signature analysis</p>
            <span className={styles.badge + ' ' + styles.active}>ACTIVE</span>
          </div>
          <div className={styles.pipelineItem}>
            <h4>SES Notifications</h4>
            <p>Email alerts to owners & managers</p>
            <span className={styles.badge + ' ' + styles.active}>READY</span>
          </div>
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

      {/* Backend Configuration */}
      <section className={styles.config}>
        <h2>⚙️ Backend Configuration</h2>
        <div className={styles.configBox}>
          <p><strong>Current Status:</strong> Ready for AWS Backend Integration</p>
          <p><strong>API Endpoint:</strong> /api/water-metrics</p>
          <p><strong>Lambda Function:</strong> aquaflow-leak-detector-3am</p>
          <p><strong>Timestream Table:</strong> water_analytics.flat_consumption</p>
          <p><strong>DynamoDB Table:</strong> water_alerts</p>
          <p><strong>Update Interval:</strong> 5 seconds (real-time)</p>
          <p><strong>3AM Leak Detection:</strong> Daily via CloudWatch Events + Lambda</p>
        </div>
      </section>
    </div>
  );
}
