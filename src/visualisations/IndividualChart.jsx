// src/ResultsChart.jsx
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function ResultsChart({ results = { treated: [], control: [], inputParams: {} } }) {
  const viralChartRef = useRef(null);
  const drugChartRef = useRef(null);
  const viralChartInstance = useRef(null);
  const drugChartInstance = useRef(null);

  const hasData = (results?.treated?.length > 0) || (results?.control?.length > 0);

  useEffect(() => {
    if (!viralChartRef.current || !drugChartRef.current || !hasData) return;

    if (!viralChartInstance.current) {
      viralChartInstance.current = echarts.init(viralChartRef.current);
    }
    if (!drugChartInstance.current) {
      drugChartInstance.current = echarts.init(drugChartRef.current);
    }

    const treatedV = (results.treated || []).map((entry) => [entry.t, entry.log10V]);
    const controlV = (results.control || []).map((entry) => [entry.t, entry.log10V]);

    const t_sigma = Number(results.inputParams.t_sigma);
    const dosing_duration = Number(results.inputParams.dosing_duration);

    const C_P_uM = (results.treated || [])
      .filter((entry) => entry.t >= t_sigma && entry.t <= t_sigma + dosing_duration)
      .map((entry) => [entry.t, entry.C_P_uM])
    ;

    console.log(t_sigma, dosing_duration)

    // Viral Load Chart Options
    const viralOption = {
      title: {
        text: 'Viral Load vs Time',
        left: 'center',
        textStyle: { fontSize: 16 }
      },
      legend: {
        top: '8%',
        data: ['Treatment', 'Control']
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const time = Number(params[0].data[0]).toFixed(2);
          let tooltipHtml = `<strong>Time: ${time}</strong><br/>`;

          params.forEach((item) => {
            const val = Number(item.data[1]).toFixed(2);
            tooltipHtml += `${item.marker} ${item.seriesName}: <strong>${val}</strong><br/>`;
          });

          return tooltipHtml;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '20%'
      },
      xAxis: {
        type: 'value',
        name: 'Time (t)',
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        name: 'Viral Load (log₁₀ copies/mL)'
      },
      series: [
        {
          name: 'Treatment',
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: treatedV,
          lineStyle: { width: 2.5, color: '#2563eb' },
          itemStyle: { color: '#2563eb' },
          z: 3,

          markArea: {
            silent: true, // Prevents mouse hover events on the box from intercepting the tooltip
            itemStyle: {
              color: 'rgba(59, 130, 246, 0.12)', // Light blue translucent background
              borderColor: 'rgba(59, 130, 246, 0.3)',
              borderWidth: 1,
              borderType: 'dashed'
            },
            label: {
              show: true,
              position: 'top',
              color: '#1d4ed8',
              fontSize: 12,
              fontWeight: 'bold'
            },
            data: [
              [
                {
                  name: 'Treatment Window', // Label displayed at the top of the box
                  xAxis: t_sigma // Start time (t) where medication begins
                },
                {
                  xAxis: t_sigma + dosing_duration // End time (t) where medication ends
                }
              ]
            ]
          }
        },
        {
          name: 'Control',
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: controlV,
          lineStyle: { width: 2, color: '#db3b3b', type: 'dashed', opacity: 0.7},
          itemStyle: { color: '#db3b3b' },
          z: 2
        }
      ]
    };

    // Drug Concentration Chart Options
    const drugOption = {
      title: {
        text: 'Drug Plasma Concentration during Dosing Window',
        left: 'center',
        textStyle: { fontSize: 14 }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const time = Number(params[0].data[0]).toFixed(2);
          const conc = Number(params[0].data[1]).toFixed(4);
          return `<strong>Time: ${time}</strong><br/>${params[0].marker} C_P: <strong>${conc} µM</strong>`;
        }
      },
      grid: { left: '10%', right: '10%', bottom: '15%', top: '20%' },
      xAxis: {
        type: 'value',
        name: 'Time (t)',
        nameLocation: 'middle',
        nameGap: 30,
        min: t_sigma,
        max: t_sigma + dosing_duration
      },
      yAxis: {
        type: 'value',
        name: 'Cₚ (µM)'
      },
      series: [
        {
          name: 'Drug Concentration',
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: C_P_uM,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.02)' }
            ])
          },
          lineStyle: { width: 2.5, color: '#10b981' },
          itemStyle: { color: '#10b981' }
        }
      ]
    };    

    viralChartInstance.current.setOption(viralOption, true);
    drugChartInstance.current.setOption(drugOption, true);

    const handleResize = () => {
      viralChartInstance.current?.resize();
      drugChartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [results, hasData]);

  useEffect(() => {
    return () => {
      viralChartInstance.current?.dispose();
      drugChartInstance.current?.dispose();
    };
  }, []);

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h3>Results</h3>
      {!hasData ? (
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
        <>
          <div
            ref={viralChartRef}
            style={{
              width: '100%',
              height: '380px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              background: '#fff'
            }}
          />
          <div
            ref={drugChartRef}
            style={{
              width: '100%',
              height: '300px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              background: '#fff'
            }}
          />
        </>
      )}
    </div>
  );
}