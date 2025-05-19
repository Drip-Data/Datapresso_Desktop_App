import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto'; // Use auto import

// Chart.js components are auto-registered with 'chart.js/auto'

interface DataDistributionChartProps {
  data: {
    labels: string[];
    values: number[];
  };
}

const DataDistributionChart: React.FC<DataDistributionChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null); // To store the chart instance

  useEffect(() => {
    if (chartRef.current && data && data.values && data.values.length > 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        console.log('DataDistributionChart: Creating new chart with data:', JSON.parse(JSON.stringify(data)));
        try {
          chartInstanceRef.current = new Chart(ctx, { 
            type: 'pie',
            data: {
              labels: data.labels.length > 0 ? data.labels : ['暂无标签'], 
              datasets: [{
                label: '数据分布', // Restored original label
                data: data.values.length > 0 ? data.values : [1], 
                backgroundColor: data.values.length > 0 ? [ 
                  'rgba(105, 65, 255, 0.7)', 
                  'rgba(78, 191, 255, 0.7)',  
                  'rgba(137, 255, 230, 0.7)' 
                ].slice(0, data.values.length) : ['rgba(200, 200, 200, 0.7)'],
                borderColor: data.values.length > 0 ? [
                  'rgba(105, 65, 255, 1)',
                  'rgba(78, 191, 255, 1)',
                  'rgba(137, 255, 230, 1)'
                ].slice(0, data.values.length) : ['rgba(200, 200, 200, 1)'],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                   labels: {
                     color: '#1F2937' 
                   }
                },
                title: {
                  display: true,
                  text: '数据类型分布', // Restored original title
                   color: '#1F2937', 
                   font: {
                     size: 16,
                     weight: 'normal' 
                   }
                }
              }
            }
          });
          console.log('DataDistributionChart: Chart instance created.');
        } catch (error) {
          console.error('DataDistributionChart: Error creating chart:', error);
        }
      }
    } else {
      if (chartInstanceRef.current) {
        console.log('DataDistributionChart: Destroying chart due to empty data.');
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      console.log('DataDistributionChart: No data to display or chartRef not available.');
    }

    return () => {
      if (chartInstanceRef.current) {
        console.log('DataDistributionChart: Destroying chart on unmount/re-render.');
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  if (!data || !data.values || data.values.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary-html">
        <p>暂无数据可供显示</p>
      </div>
    );
  }

  return <canvas ref={chartRef} style={{ maxHeight: '300px', width: '100%' }}></canvas>;
};

export default DataDistributionChart;