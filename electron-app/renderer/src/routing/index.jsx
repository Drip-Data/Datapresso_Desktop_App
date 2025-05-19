import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { utils } from '../utils/electronBridge';

// 导入页面组件
import HomePage from '../pages/HomePage';
import DataFilteringPage from '../pages/DataFilteringPage';
import DataGenerationPage from '../pages/DataGenerationPage';
import EvaluationPage from '../pages/EvaluationPage';
import LlmApiPage from '../pages/LlmApiPage';
import QualityAssessmentPage from '../pages/QualityAssessmentPage';
import SettingsPage from '../pages/SettingsPage';
import NotFoundPage from '../pages/NotFoundPage';

// 导入布局组件
import MainLayout from '../layouts/MainLayout';

export default function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/data-filtering" element={<DataFilteringPage />} />
          <Route path="/data-generation" element={<DataGenerationPage />} />
          <Route path="/evaluation" element={<EvaluationPage />} />
          <Route path="/llm-api" element={<LlmApiPage />} />
          <Route path="/quality-assessment" element={<QualityAssessmentPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
