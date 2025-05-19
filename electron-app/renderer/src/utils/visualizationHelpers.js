import * as echarts from 'echarts';

/**
 * 可视化辅助类
 * 提供常用的数据可视化功能
 */
export class VisualizationHelpers {
  /**
   * 创建折线图
   * @param {string} elementId - 图表容器ID
   * @param {Array} data - 数据数组
   * @param {Object} options - 图表选项
   * @returns {echarts.ECharts} - ECharts实例
   */
  static createLineChart(elementId, data, options = {}) {
    const chartDom = document.getElementById(elementId);
    const chart = echarts.init(chartDom);
    
    const defaultOptions = {
      title: { text: options.title || '折线图' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: options.xAxisData || data.map((_, index) => `${index + 1}`)
      },
      yAxis: { type: 'value' },
      series: [{
        data: data,
        type: 'line',
        smooth: options.smooth || true,
        name: options.seriesName || '数据系列',
        color: options.color || '#5470c6'
      }]
    };
    
    const mergedOptions = this._mergeOptions(defaultOptions, options);
    chart.setOption(mergedOptions);
    
    window.addEventListener('resize', () => chart.resize());
    
    return chart;
  }
  
  /**
   * 创建柱状图
   * @param {string} elementId - 图表容器ID
   * @param {Array} data - 数据数组
   * @param {Object} options - 图表选项
   * @returns {echarts.ECharts} - ECharts实例
   */
  static createBarChart(elementId, data, options = {}) {
    const chartDom = document.getElementById(elementId);
    const chart = echarts.init(chartDom);
    
    const defaultOptions = {
      title: { text: options.title || '柱状图' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: options.categories || data.map((_, index) => `类别${index + 1}`)
      },
      yAxis: { type: 'value' },
      series: [{
        data: data,
        type: 'bar',
        name: options.seriesName || '数据系列',
        color: options.color || '#5470c6'
      }]
    };
    
    const mergedOptions = this._mergeOptions(defaultOptions, options);
    chart.setOption(mergedOptions);
    
    window.addEventListener('resize', () => chart.resize());
    
    return chart;
  }
  
  /**
   * 创建饼图
   * @param {string} elementId - 图表容器ID
   * @param {Array} data - 数据数组，格式为[{name: '名称', value: 值}]
   * @param {Object} options - 图表选项
   * @returns {echarts.ECharts} - ECharts实例
   */
  static createPieChart(elementId, data, options = {}) {
    const chartDom = document.getElementById(elementId);
    const chart = echarts.init(chartDom);
    
    const defaultOptions = {
      title: { text: options.title || '饼图' },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 10,
        data: data.map(item => item.name)
      },
      series: [{
        name: options.seriesName || '数据系列',
        type: 'pie',
        radius: options.radius || ['50%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'outside'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: data
      }]
    };
    
    const mergedOptions = this._mergeOptions(defaultOptions, options);
    chart.setOption(mergedOptions);
    
    window.addEventListener('resize', () => chart.resize());
    
    return chart;
  }
  
  /**
   * 创建散点图
   * @param {string} elementId - 图表容器ID
   * @param {Array} data - 数据数组，格式为[[x, y], [x, y], ...]
   * @param {Object} options - 图表选项
   * @returns {echarts.ECharts} - ECharts实例
   */
  static createScatterChart(elementId, data, options = {}) {
    const chartDom = document.getElementById(elementId);
    const chart = echarts.init(chartDom);
    
    const defaultOptions = {
      title: { text: options.title || '散点图' },
      tooltip: {
        trigger: 'item',
        formatter: params => `(${params.value[0]}, ${params.value[1]})`
      },
      xAxis: {},
      yAxis: {},
      series: [{
        symbolSize: options.symbolSize || 10,
        data: data,
        type: 'scatter',
        name: options.seriesName || '数据系列',
        color: options.color || '#5470c6'
      }]
    };
    
    const mergedOptions = this._mergeOptions(defaultOptions, options);
    chart.setOption(mergedOptions);
    
    window.addEventListener('resize', () => chart.resize());
    
    return chart;
  }
  
  /**
   * 创建热力图
   * @param {string} elementId - 图表容器ID
   * @param {Array} data - 数据数组，格式为[[x, y, value], [x, y, value], ...]
   * @param {Object} options - 图表选项
   * @returns {echarts.ECharts} - ECharts实例
   */
  static createHeatmapChart(elementId, data, options = {}) {
    const chartDom = document.getElementById(elementId);
    const chart = echarts.init(chartDom);
    
    const defaultOptions = {
      title: { text: options.title || '热力图' },
      tooltip: {
        position: 'top',
        formatter: params => `Value: ${params.value[2]}`
      },
      xAxis: {
        type: 'category',
        data: options.xAxisData || [],
        splitArea: { show: true }
      },
      yAxis: {
        type: 'category',
        data: options.yAxisData || [],
        splitArea: { show: true }
      },
      visualMap: {
        min: options.min || 0,
        max: options.max || 10,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '15%'
      },
      series: [{
        name: options.seriesName || '热力值',
        type: 'heatmap',
        data: data,
        label: {
          show: options.showLabel || false
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
    
    const mergedOptions = this._mergeOptions(defaultOptions, options);
    chart.setOption(mergedOptions);
    
    window.addEventListener('resize', () => chart.resize());
    
    return chart;
  }
  
  /**
   * 创建雷达图
   * @param {string} elementId - 图表容器ID
   * @param {Array} data - 数据数组
   * @param {Array} indicators - 指标数组，格式为[{name: '名称', max: 最大值}, ...]
   * @param {Object} options - 图表选项
   * @returns {echarts.ECharts} - ECharts实例
   */
  static createRadarChart(elementId, data, indicators, options = {}) {
    const chartDom = document.getElementById(elementId);
    const chart = echarts.init(chartDom);
    
    const defaultOptions = {
      title: { text: options.title || '雷达图' },
      tooltip: {},
      legend: {
        data: options.legendData || ['数据系列']
      },
      radar: {
        indicator: indicators
      },
      series: [{
        name: options.seriesName || '数据分析',
        type: 'radar',
        data: [
          {
            value: data,
            name: options.dataName || '数据系列'
          }
        ]
      }]
    };
    
    const mergedOptions = this._mergeOptions(defaultOptions, options);
    chart.setOption(mergedOptions);
    
    window.addEventListener('resize', () => chart.resize());
    
    return chart;
  }
  
  /**
   * 数据统计与处理方法
   */
  
  /**
   * 计算数据的基本统计信息
   * @param {Array<number>} data - 数值数组
   * @returns {Object} 统计信息
   */
  static calculateStats(data) {
    const numericData = data.filter(x => typeof x === 'number' && !isNaN(x));
    
    if (numericData.length === 0) {
      return {
        count: 0,
        sum: 0,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        variance: 0,
        stdDev: 0
      };
    }
    
    // 排序数据（用于计算中位数）
    const sortedData = [...numericData].sort((a, b) => a - b);
    
    // 基本统计
    const count = numericData.length;
    const sum = numericData.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;
    
    // 中位数
    const midIndex = Math.floor(count / 2);
    const median = count % 2 === 0
      ? (sortedData[midIndex - 1] + sortedData[midIndex]) / 2
      : sortedData[midIndex];
    
    // 最小值和最大值
    const min = sortedData[0];
    const max = sortedData[count - 1];
    
    // 方差和标准差
    const variance = numericData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);
    
    return {
      count,
      sum,
      mean,
      median,
      min,
      max,
      variance,
      stdDev
    };
  }
  
  /**
   * 将数据分组并计算频率
   * @param {Array} data - 数据数组
   * @param {Function} [keyFn] - 分组键函数
   * @returns {Object} 分组频率
   */
  static groupByFrequency(data, keyFn = x => x) {
    const frequencies = {};
    
    data.forEach(item => {
      const key = keyFn(item);
      frequencies[key] = (frequencies[key] || 0) + 1;
    });
    
    return frequencies;
  }
  
  /**
   * 将数据按区间分组
   * @param {Array<number>} data - 数值数组
   * @param {number} binCount - 区间数量
   * @returns {Object} 区间分组
   */
  static binData(data, binCount = 10) {
    const numericData = data.filter(x => typeof x === 'number' && !isNaN(x));
    
    if (numericData.length === 0) {
      return { bins: [], counts: [] };
    }
    
    const min = Math.min(...numericData);
    const max = Math.max(...numericData);
    const binWidth = (max - min) / binCount;
    
    // 创建区间
    const bins = Array(binCount).fill(0).map((_, i) => min + i * binWidth);
    const counts = Array(binCount).fill(0);
    
    // 统计每个区间的数量
    numericData.forEach(value => {
      // 特殊处理最大值，归入最后一个区间
      if (value === max) {
        counts[binCount - 1]++;
        return;
      }
      
      const binIndex = Math.floor((value - min) / binWidth);
      if (binIndex >= 0 && binIndex < binCount) {
        counts[binIndex]++;
      }
    });
    
    // 格式化区间标签
    const binLabels = bins.map((bin, i) => 
      i === binCount - 1 
        ? `[${bin.toFixed(2)}, ${max.toFixed(2)}]` 
        : `[${bin.toFixed(2)}, ${(bin + binWidth).toFixed(2)})`
    );
    
    return {
      bins: binLabels,
      counts
    };
  }
  
  /**
   * 私有方法：合并选项
   * @private
   */
  static _mergeOptions(defaultOptions, userOptions) {
    const merged = { ...defaultOptions };
    
    // 递归合并对象
    for (const key in userOptions) {
      if (Object.prototype.hasOwnProperty.call(userOptions, key)) {
        if (typeof userOptions[key] === 'object' && !Array.isArray(userOptions[key]) && 
            userOptions[key] !== null && key in defaultOptions) {
          merged[key] = this._mergeOptions(defaultOptions[key], userOptions[key]);
        } else {
          merged[key] = userOptions[key];
        }
      }
    }
    
    return merged;
  }
}

export default VisualizationHelpers;
