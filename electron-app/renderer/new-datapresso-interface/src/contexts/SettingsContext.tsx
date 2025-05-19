import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
export type ThemePreference = 'light' | 'dark' | 'system';
export type ExecutionMode = 'demo' | 'production';

interface SettingsContextType {
  executionMode: ExecutionMode;
  setExecutionMode: (mode: ExecutionMode) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  // Potentially add other global settings here in the future
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [executionMode, setExecutionModeState] = useState<ExecutionMode>(() => {
    // Load saved mode from localStorage or default to 'demo'
    return (localStorage.getItem('datapressoExecutionMode') as ExecutionMode) || 'production'; // Default to production
  });

  const [theme, setThemeState] = useState<ThemePreference>(() => {
    return (localStorage.getItem('datapressoTheme') as ThemePreference) || 'system';
  });

  const setExecutionMode = useCallback((mode: ExecutionMode) => {
    setExecutionModeState(mode);
    localStorage.setItem('datapressoExecutionMode', mode);
    // Notify apiAdapter about the mode change
    // Option 1: Via a function exposed on window.electronAPI (if preload.js is modified to include it)
    if (window.electronAPI && typeof window.electronAPI.setApiExecutionMode === 'function') {
      window.electronAPI.setApiExecutionMode(mode);
    }
    // Option 2: Via a global function set directly on window by apiAdapter.js
    else if (typeof window.setApiExecutionModeGlobally === 'function') {
      window.setApiExecutionModeGlobally(mode);
    } else {
      console.warn('setApiExecutionModeGlobally or window.electronAPI.setApiExecutionMode not found. API adapter mode might not be updated.');
    }
    console.log(`Execution mode set to: ${mode}`);
  }, []);

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    localStorage.setItem('datapressoTheme', newTheme);
    // Apply theme to documentElement for Tailwind dark mode
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
    console.log(`Theme set to: ${newTheme}`);
  }, []);

  // Initialize apiAdapter's mode and apply initial theme on first load
  useEffect(() => {
    // Set execution mode for API adapter
    if (window.electronAPI && typeof window.electronAPI.setApiExecutionMode === 'function') {
      window.electronAPI.setApiExecutionMode(executionMode);
    } else if (typeof window.setApiExecutionModeGlobally === 'function') {
      window.setApiExecutionModeGlobally(executionMode);
    }

    // Apply initial theme
    setTheme(theme); // Call setTheme to apply class to root
  }, [executionMode, theme, setTheme]); // setTheme is stable due to useCallback

  return (
    <SettingsContext.Provider value={{ executionMode, setExecutionMode, theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};