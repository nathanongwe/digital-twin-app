// src/ResultsChart.jsx
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function ResultsChart({ results = [] }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || results.length === 0) return;

    // Initialize chart if it doesn't exist
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // Map jsResults: [time, log10V]
    const chartData = results.map((entry) => [entry.t, entry.log10V]);

    const option = {
      title: {
        text: 'Viral Load (log10V) vs Time',
        left: 'center',
        textStyle: { fontSize: 16 }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          if (!params || !params[0]) return '';
          const [t, log10V] = params[0].data;
          return `Time: ${Number(t).toFixed(2)}<br/>log10V: ${Number(log10V).toFixed(2)}`;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%'
      },
      xAxis: {
        type: 'value',
        name: 'Time (t)',
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        name: 'log10V'
      },
      series: [
        {
          name: 'log10V',
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: chartData,
          lineStyle: { width: 2, color: '#2563eb' }
        }
      ]
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [results]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h3>Results</h3>
      {results.length === 0 ? (
        <div
          style={{
            background: '#f4f4f4',
            padding: '1.5rem',
            textAlign: 'center',
            color: '#666',
            borderRadius: '4px'
          }}
        >
          No simulation run yet.
        </div>
      ) : (
        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: '420px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            background: '#fff'
          }}
        />
      )}
    </div>
  );
}