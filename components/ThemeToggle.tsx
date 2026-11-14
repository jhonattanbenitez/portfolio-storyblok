'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTheme as useMounted } from '../hooks/useTheme';
import { SunIcon, MoonIcon, ComputerDesktopIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface ThemeToggleProps {
  responsiveCompact?: boolean;
}

export default function ThemeToggle({ responsiveCompact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { mounted } = useMounted();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen]);

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
      <div className={`nav-control ${responsiveCompact ? 'md:h-8 md:w-10 lg:h-10 lg:w-20' : 'h-10 w-20'} animate-pulse rounded-md border border-border bg-secondary`} />
    );
  }

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !isOpen) return;
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`nav-control flex items-center rounded-md border border-border bg-secondary text-sm font-medium text-secondary-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          responsiveCompact ? 'h-8 gap-1 px-2 lg:h-10 lg:gap-2 lg:px-3' : 'h-10 gap-2 px-3'
        }`}
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <CurrentIcon className="w-4 h-4" />
        <span className={responsiveCompact ? "hidden lg:inline" : "hidden sm:inline"}>{currentTheme?.label}</span>
        <ChevronDownIcon
          className="motion-indicator w-4 h-4"
          data-state={isOpen ? 'open' : 'closed'}
          data-motion-kind="chevron"
          aria-hidden="true"
        />
      </button>

        <div
          id={panelId}
          data-state={isOpen ? 'open' : 'closed'}
          data-motion-kind="dropdown"
          inert={!isOpen}
          aria-hidden={!isOpen}
          className="motion-panel nav-panel absolute right-0 z-50 mt-2 w-48 rounded-md border border-border text-popover-foreground shadow-lg"
        >
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            return (
              <button
                key={themeOption.value}
                type="button"
                aria-pressed={theme === themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className={`nav-option flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  theme === themeOption.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{themeOption.label}</span>
                {theme === themeOption.value && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-current" />
                )}
              </button>
            );
          })}
        </div>
    </div>
  );
}
