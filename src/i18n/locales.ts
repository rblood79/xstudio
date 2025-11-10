/**
 * Locale Configurations
 *
 * Defines configuration for each supported locale
 */

import type { LocaleConfig, SupportedLocale } from './types';

/**
 * All locale configurations
 */
export const localeConfigs: Record<SupportedLocale, LocaleConfig> = {
  'ko-KR': {
    locale: 'ko-KR',
    name: '한국어',
    direction: 'ltr',
    dateFormat: 'YYYY년 MM월 DD일',
    timeFormat: 24,
    currency: 'KRW',
  },
  'en-US': {
    locale: 'en-US',
    name: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 12,
    currency: 'USD',
  },
  'ja-JP': {
    locale: 'ja-JP',
    name: '日本語',
    direction: 'ltr',
    dateFormat: 'YYYY年MM月DD日',
    timeFormat: 24,
    currency: 'JPY',
  },
  'zh-CN': {
    locale: 'zh-CN',
    name: '简体中文',
    direction: 'ltr',
    dateFormat: 'YYYY年MM月DD日',
    timeFormat: 24,
    currency: 'CNY',
  },
};

/**
 * Default locale
 */
export const DEFAULT_LOCALE: SupportedLocale = 'ko-KR';

/**
 * Get locale configuration
 */
export function getLocaleConfig(locale: SupportedLocale): LocaleConfig {
  return localeConfigs[locale] || localeConfigs[DEFAULT_LOCALE];
}

/**
 * Get browser locale if supported, otherwise return default
 */
export function getBrowserLocale(): SupportedLocale {
  const browserLocale = navigator.language;

  // Check exact match
  if (browserLocale in localeConfigs) {
    return browserLocale as SupportedLocale;
  }

  // Check language prefix (e.g., 'ko' from 'ko-KR')
  const languagePrefix = browserLocale.split('-')[0];
  const matchingLocale = Object.keys(localeConfigs).find((locale) =>
    locale.startsWith(languagePrefix)
  );

  return (matchingLocale as SupportedLocale) || DEFAULT_LOCALE;
}

/**
 * Get locale from localStorage or browser
 */
export function getStoredLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem('xstudio-locale');
    if (stored && stored in localeConfigs) {
      return stored as SupportedLocale;
    }
  } catch (error) {
    console.error('Error reading locale from localStorage:', error);
  }

  return getBrowserLocale();
}

/**
 * Save locale to localStorage
 */
export function setStoredLocale(locale: SupportedLocale): void {
  try {
    localStorage.setItem('xstudio-locale', locale);
  } catch (error) {
    console.error('Error saving locale to localStorage:', error);
  }
}
