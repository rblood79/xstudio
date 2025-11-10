/**
 * I18n Module
 *
 * Exports all internationalization functionality
 */

export { I18nProvider } from './I18nProvider';
export { useI18n } from './useI18n';
export { translations, getTranslation, replacePlaceholders } from './translations';
export { localeConfigs, DEFAULT_LOCALE, getLocaleConfig, getBrowserLocale, getStoredLocale, setStoredLocale } from './locales';
export type { SupportedLocale, Direction, LocaleConfig, TranslationKeys, I18nContextValue } from './types';
