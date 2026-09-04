import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { effectiveTheme, setThemeMode } = useTheme();

  const toggleTheme = () => {
    setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-[100] w-12 h-12 rounded-full bg-[#1C1917] dark:bg-white text-white dark:text-black shadow-lg shadow-black/20 dark:shadow-white/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300"
      aria-label="Alternar tema oscuro/claro"
    >
      {effectiveTheme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};
