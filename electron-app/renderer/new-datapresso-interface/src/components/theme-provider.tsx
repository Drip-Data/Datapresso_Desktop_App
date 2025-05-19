import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light", // Force default to light
  storageKey = "vite-ui-theme", // Keep for consistency, though not strictly needed if locked
  ...props
}: ThemeProviderProps) {
  // Force theme to be "light" and prevent changes
  const [theme, _setInternalTheme] = useState<Theme>("light");

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark"); // Ensure dark class is removed
    root.classList.add("light"); // Ensure light class is present
    // No need to check system theme if we are forcing light
  }, []); // Run only once on mount

  const value = {
    theme: "light" as Theme, // Always report "light"
    setTheme: (_newTheme: Theme) => {
      // Do nothing, or log a warning if theme change is attempted
      // console.warn("Theme changes are disabled. Application is locked to light theme.");
      // _setInternalTheme("light"); // Ensure internal state remains light if ever changed by mistake
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};