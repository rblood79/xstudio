/**
 * Language Switcher Component
 *
 * Allows users to switch between supported locales
 */

import React from 'react';
import { Select, SelectItem } from '../builder/components/Select';
import { useI18n } from './useI18n';
import { localeConfigs } from './locales';
import type { SupportedLocale } from './types';
import { Globe } from 'lucide-react';

export interface LanguageSwitcherProps {
  /**
   * Display label for the select
   * @default "Language"
   */
  label?: string;
  /**
   * Show globe icon
   * @default true
   */
  showIcon?: boolean;
  /**
   * Additional className
   */
  className?: string;
}

/**
 * Language Switcher Component
 *
 * Renders a select dropdown for switching languages
 *
 * @example
 * ```tsx
 * <LanguageSwitcher label="언어" />
 * ```
 */
export function LanguageSwitcher({
  label,
  showIcon = true,
  className,
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  const handleSelectionChange = (key: React.Key) => {
    setLocale(key as SupportedLocale);
  };

  const effectiveLabel = label || t('common.select');

  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      {showIcon && <Globe size={16} />}
      <Select
        label={effectiveLabel}
        selectedKey={locale}
        onSelectionChange={handleSelectionChange}
        aria-label="Select language"
      >
        {Object.values(localeConfigs).map((config) => (
          <SelectItem key={config.locale} id={config.locale}>
            {config.name}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}
