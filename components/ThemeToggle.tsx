'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTheme as useMounted } from '../hooks/useTheme';
import { SunIcon, MoonIcon, ComputerDesktopIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { mounted } = useMounted();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes = [
    { value: 'light' as const, label: 'Light', icon: SunIcon },
    { value: 'dark' as const, label: 'Dark', icon: MoonIcon },
    { value: 'system' as const, label: 'System', icon: ComputerDesktopIcon },
  ];

  const currentTheme = themes.find(t => t.value === theme);
  const CurrentIcon = currentTheme?.icon || SunIcon;



  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="w-20 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
        aria-label="Toggle theme"
      >
        <CurrentIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{currentTheme?.label}</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            return (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
                  theme === themeOption.value
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{themeOption.label}</span>
                {theme === themeOption.value && (
                  <div className="ml-auto w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
