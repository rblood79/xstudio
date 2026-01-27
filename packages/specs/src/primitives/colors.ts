/**
 * Color Tokens
 *
 * Material Design 3 기반 색상 토큰
 *
 * @packageDocumentation
 */

import type { ColorTokens } from '../types/token.types';

/**
 * Light 모드 색상 토큰
 * Material Design 3 기반
 */
export const lightColors: ColorTokens = {
  // Primary (Purple)
  primary: '#6750a4',
  'primary-hover': '#5c4799',
  'primary-pressed': '#523e8e',
  'on-primary': '#ffffff',

  // Secondary
  secondary: '#625b71',
  'secondary-hover': '#584f66',
  'secondary-pressed': '#4e455c',
  'on-secondary': '#ffffff',

  // Tertiary
  tertiary: '#7d5260',
  'tertiary-hover': '#714956',
  'tertiary-pressed': '#65404c',
  'on-tertiary': '#ffffff',

  // Error
  error: '#b3261e',
  'error-hover': '#a1221b',
  'error-pressed': '#8f1e18',
  'on-error': '#ffffff',

  // Surface
  surface: '#fef7ff',
  'surface-container': '#f3edf7',
  'surface-container-high': '#ece6f0',
  'surface-container-highest': '#e6e0e9',
  'on-surface': '#1d1b20',

  // Outline
  outline: '#79747e',
  'outline-variant': '#cac4d0',
};

/**
 * Dark 모드 색상 토큰
 */
export const darkColors: ColorTokens = {
  // Primary
  primary: '#d0bcff',
  'primary-hover': '#c4aff7',
  'primary-pressed': '#b8a2ef',
  'on-primary': '#381e72',

  // Secondary
  secondary: '#ccc2dc',
  'secondary-hover': '#c0b5d0',
  'secondary-pressed': '#b4a8c4',
  'on-secondary': '#332d41',

  // Tertiary
  tertiary: '#efb8c8',
  'tertiary-hover': '#e3acbc',
  'tertiary-pressed': '#d7a0b0',
  'on-tertiary': '#492532',

  // Error
  error: '#f2b8b5',
  'error-hover': '#e6acab',
  'error-pressed': '#daa0a1',
  'on-error': '#601410',

  // Surface
  surface: '#141218',
  'surface-container': '#211f26',
  'surface-container-high': '#2b2930',
  'surface-container-highest': '#36343b',
  'on-surface': '#e6e0e9',

  // Outline
  outline: '#938f99',
  'outline-variant': '#49454f',
};

/**
 * 현재 테마에 따른 색상 반환
 */
export function getColorToken(name: keyof ColorTokens, theme: 'light' | 'dark' = 'light'): string {
  return theme === 'dark' ? darkColors[name] : lightColors[name];
}

/**
 * 테마별 색상 객체 반환
 */
export function getColorTokens(theme: 'light' | 'dark' = 'light'): ColorTokens {
  return theme === 'dark' ? darkColors : lightColors;
}
