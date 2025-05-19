import DataGenerationComponent from '../components/data-generation-component.js';

let dataGenerationComponent = null;

// 初始化函数
function initialize() {
    const container = document.getElementById('data-generation-container');
    if (!container) {
        console.error('数据生成容器不存在');
        return;
    }
    
    dataGenerationComponent = new DataGenerationComponent('data-generation-container');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查当前页面是否是数据生成页面
    const dataGenerationPage = document.getElementById('data-generation');
    if (dataGenerationPage && dataGenerationPage.classList.contains('active')) {
        initialize();
    }
});

// 监听导航事件
document.addEventListener('page-changed', (event) => {
    if (event.detail.page === 'data-generation') {
        initialize();
    }
});

// 导出API
export default {
    initialize
};
