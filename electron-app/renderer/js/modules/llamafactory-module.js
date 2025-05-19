import LlamaFactoryTrainingComponent from '../components/llamafactory-training-component.js';

let trainingComponent = null;

// 初始化函数
function initialize() {
    const container = document.getElementById('llamafactory-container');
    if (!container) {
        console.error('LlamaFactory容器不存在');
        return;
    }
    
    trainingComponent = new LlamaFactoryTrainingComponent('llamafactory-container');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查当前页面是否是LlamaFactory页面
    const llamaFactoryPage = document.getElementById('llamafactory');
    if (llamaFactoryPage && llamaFactoryPage.classList.contains('active')) {
        initialize();
    }
});

// 监听导航事件
document.addEventListener('page-changed', (event) => {
    if (event.detail.page === 'llamafactory') {
        initialize();
    }
});

// 导出API
export default {
    initialize
};
