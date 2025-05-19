import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from "@/components/theme-provider";
import { LLMConfigProvider } from './contexts/LLMConfigContext';
import { ApiKeysProvider } from './contexts/ApiKeysContext'; // Added import
import { SettingsProvider } from './contexts/SettingsContext'; // Import SettingsProvider

// Chart.js components will be auto-registered by importing 'chart.js/auto'
// in the component that uses it.
// Global registration removed from here.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <SettingsProvider> {/* Wrap with SettingsProvider */}
        <LLMConfigProvider>
          <ApiKeysProvider>
            <App />
          </ApiKeysProvider>
        </LLMConfigProvider>
      </SettingsProvider>
    </ThemeProvider>
  </React.StrictMode>,
)