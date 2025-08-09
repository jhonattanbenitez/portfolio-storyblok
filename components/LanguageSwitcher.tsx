"use client";
import React from "react";
import { useLanguage } from "../contexts/LanguageContext";

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (newLanguage: "es" | "en") => {
    setLanguage(newLanguage);
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
      <button
        onClick={() => handleLanguageChange("en")}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
          language === "en"
            ? "bg-blue-600 text-white shadow-md"
            : "text-gray-300 hover:text-white hover:bg-gray-700"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => handleLanguageChange("es")}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
          language === "es"
            ? "bg-blue-600 text-white shadow-md"
            : "text-gray-300 hover:text-white hover:bg-gray-700"
        }`}
        aria-label="Switch to Spanish"
      >
        ES
      </button>
    </div>
  );
};

export default LanguageSwitcher;
