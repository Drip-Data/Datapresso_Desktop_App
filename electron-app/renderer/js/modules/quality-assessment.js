import QualityAssessmentComponent from '../components/quality-assessment-component.js';

let qualityAssessmentComponent = null;

// 模块初始化函数
export function initQualityAssessment() {
    // 创建质量评估组件
    qualityAssessmentComponent = new QualityAssessmentComponent('quality-assessment-container');
    
    console.log('质量评估模块已初始化');
}

// 模块清理函数
export function cleanupQualityAssessment() {
    qualityAssessmentComponent = null;
}

// 如果在DOM加载完成后直接初始化，可以添加:
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('quality-assessment-container');
    if (container) {
        initQualityAssessment();
    }
});
