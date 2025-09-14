// Supported language types
export type SupportedLanguage = "zh-CN" | "en-US";

// LocalStorage key name for language settings
const LANGUAGE_KEY = "pixel-lab-language";

// List of supported languages
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["zh-CN", "en-US"];

// Default language
const DEFAULT_LANGUAGE: SupportedLanguage = "en-US";

/**
 * Check if it's a supported language
 */
export const isSupportedLanguage = (
  language: string
): language is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
};

/**
 * Get browser language preference
 */
export const getBrowserLanguage = (): SupportedLanguage => {
  try {
    const browserLanguage = navigator.language || navigator.languages?.[0];
    if (browserLanguage) {
      // Match supported languages
      if (browserLanguage.startsWith("zh")) {
        return "zh-CN";
      }
      if (browserLanguage.startsWith("en")) {
        return "en-US";
      }
    }
  } catch (error) {
    console.warn("Unable to get browser language settings:", error);
  }

  return DEFAULT_LANGUAGE;
};

/**
 * Get saved language settings from localStorage
 */
export const getSavedLanguage = (): SupportedLanguage | null => {
  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && isSupportedLanguage(savedLanguage)) {
      return savedLanguage;
    }
  } catch (error) {
    console.warn("Unable to read language settings from localStorage:", error);
  }

  return null;
};

/**
 * Save language settings to localStorage
 */
export const saveLanguage = (language: SupportedLanguage): boolean => {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
    return true;
  } catch (error) {
    console.warn("Unable to save language settings to localStorage:", error);
    return false;
  }
};

/**
 * Get initial language settings
 * Priority: localStorage > browser language > default language
 */
export const getInitialLanguage = (): SupportedLanguage => {
  // 1. Prioritize saved language settings
  const savedLanguage = getSavedLanguage();
  if (savedLanguage) {
    return savedLanguage;
  }

  // 2. Use browser language
  // return getBrowserLanguage();

  // 3. Default language
  return DEFAULT_LANGUAGE;
};

/**
 * Remove saved language settings
 */
export const clearSavedLanguage = (): boolean => {
  try {
    localStorage.removeItem(LANGUAGE_KEY);
    return true;
  } catch (error) {
    console.warn("Unable to clear language settings from localStorage:", error);
    return false;
  }
};
