// 导入模块
import dataFiltering from './modules/data-filtering.js';
import dataGeneration from './modules/data-generation.js';
import qualityAssessment from './modules/quality-assessment.js';
import llamaFactoryModule from './modules/llamafactory-module.js';

// 初始化模块
document.addEventListener('DOMContentLoaded', () => {
    // 初始化LlamaFactory模块
    llamaFactoryModule.initialize();

    // 获取所有导航项和页面
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    // 为每个导航项添加点击事件
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        // 移除所有导航项的active类
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // 为当前点击的导航项添加active类
        item.classList.add('active');
        
        // 获取目标页面ID
        const targetId = item.getAttribute('data-target');
        
        // 隐藏所有页面
        pages.forEach(page => page.classList.remove('active'));
        
        // 显示目标页面
        document.getElementById(targetId).classList.add('active');
      });
    });
});