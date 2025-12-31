/**
 * M3 Color System Guide Component
 * Displays Material Design 3 Color Roles diagram with actual theme colors
 */

import React, { useEffect, useState } from 'react';
import './M3ColorSystemGuide.css';

interface M3ColorSystemGuideProps {
  themeId: string;
  projectId: string;
  isDarkMode?: boolean;
}

// Unused interface - may be needed in the future
// interface DesignToken {
//   id: string;
//   name: string;
//   value: string;
//   type: string;
//   scope: 'light' | 'dark' | 'global';
// }

interface M3ColorRole {
  role: string;
  label: string;
  lightShade: string;
  darkShade: string;
  category: 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface';
}

// Helper function: HSL to Hex conversion
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const M3_COLOR_ROLES: M3ColorRole[] = [
  // Primary
  { role: 'primary', label: 'Primary', lightShade: 'primary-600', darkShade: 'primary-400', category: 'primary' },
  { role: 'on-primary', label: 'On Primary', lightShade: 'white', darkShade: 'primary-900', category: 'primary' },
  { role: 'primary-container', label: 'Primary Container', lightShade: 'primary-100', darkShade: 'primary-800', category: 'primary' },
  { role: 'on-primary-container', label: 'On Primary Container', lightShade: 'primary-900', darkShade: 'primary-100', category: 'primary' },

  // Secondary
  { role: 'secondary', label: 'Secondary', lightShade: 'secondary-600', darkShade: 'secondary-400', category: 'secondary' },
  { role: 'on-secondary', label: 'On Secondary', lightShade: 'white', darkShade: 'secondary-900', category: 'secondary' },
  { role: 'secondary-container', label: 'Secondary Container', lightShade: 'secondary-100', darkShade: 'secondary-800', category: 'secondary' },
  { role: 'on-secondary-container', label: 'On Secondary Container', lightShade: 'secondary-900', darkShade: 'secondary-100', category: 'secondary' },

  // Tertiary
  { role: 'tertiary', label: 'Tertiary', lightShade: 'tertiary-600', darkShade: 'tertiary-400', category: 'tertiary' },
  { role: 'on-tertiary', label: 'On Tertiary', lightShade: 'white', darkShade: 'tertiary-900', category: 'tertiary' },
  { role: 'tertiary-container', label: 'Tertiary Container', lightShade: 'tertiary-100', darkShade: 'tertiary-800', category: 'tertiary' },
  { role: 'on-tertiary-container', label: 'On Tertiary Container', lightShade: 'tertiary-900', darkShade: 'tertiary-100', category: 'tertiary' },

  // Error
  { role: 'error', label: 'Error', lightShade: 'error-600', darkShade: 'error-400', category: 'error' },
  { role: 'on-error', label: 'On Error', lightShade: 'white', darkShade: 'error-900', category: 'error' },
  { role: 'error-container', label: 'Error Container', lightShade: 'error-100', darkShade: 'error-800', category: 'error' },
  { role: 'on-error-container', label: 'On Error Container', lightShade: 'error-900', darkShade: 'error-100', category: 'error' },

  // Surface
  { role: 'surface', label: 'Surface', lightShade: 'surface-50', darkShade: 'surface-900', category: 'surface' },
  { role: 'surface-container', label: 'Surface Container', lightShade: 'surface-100', darkShade: 'surface-800', category: 'surface' },
  { role: 'surface-container-high', label: 'Surface Container High', lightShade: 'surface-200', darkShade: 'surface-700', category: 'surface' },
  { role: 'surface-container-highest', label: 'Surface Container Highest', lightShade: 'surface-300', darkShade: 'surface-600', category: 'surface' },
];

export function M3ColorSystemGuide({ themeId, projectId, isDarkMode = false }: M3ColorSystemGuideProps) {
  const [tokens, setTokens] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTokens() {
      try {
        // Use IndexedDB like TokenService does
        const { getDB } = await import('../../../../lib/db');
        const db = await getDB();

        // Fetch all tokens from IndexedDB and filter by theme
        const allProjectTokens = await db.designTokens.getAll();
        const allTokens = allProjectTokens.filter((t: { theme_id?: string }) => t.theme_id === themeId);

        // Create token map: name → value
        const tokenMap = new Map<string, string>();

        allTokens.forEach((token: { type: string; name: string; value: unknown }) => {
          // Only process color tokens
          if (token.type !== 'color') return;

          // Parse token name - handle both formats:
          // 1. "color.primary.600" → "primary-600"
          // 2. "primary-600" → "primary-600"
          let tokenName = token.name;

          // Remove "color." prefix if exists
          if (tokenName.startsWith('color.')) {
            tokenName = tokenName.replace('color.', '');
          }

          // Replace dots with dashes
          tokenName = tokenName.replace(/\./g, '-');

          // Extract color value - handle both string and object formats
          let colorValue: string;

          if (typeof token.value === 'string') {
            colorValue = token.value;
          } else if (token.value && typeof token.value === 'object') {
            // Handle object format: { h: 250, s: 50, l: 60 } or { hex: "#6750A4" }
            const valueObj = token.value as Record<string, unknown>;
            if (typeof valueObj.hex === 'string') {
              colorValue = valueObj.hex;
            } else if (typeof valueObj.h === 'number' && typeof valueObj.s === 'number' && typeof valueObj.l === 'number') {
              // Convert HSL to hex
              colorValue = hslToHex(valueObj.h, valueObj.s, valueObj.l);
            } else {
              console.warn('[M3ColorSystemGuide] Unknown value format:', tokenName, token.value);
              return;
            }
          } else {
            return;
          }

          // Add to token map (all raw tokens are used for both light and dark)
          tokenMap.set(tokenName, colorValue);
        });

        // Add white/black as fallbacks
        if (!tokenMap.has('white')) tokenMap.set('white', '#FFFFFF');
        if (!tokenMap.has('black')) tokenMap.set('black', '#000000');

        setTokens(tokenMap);
      } catch (error) {
        console.error('[M3ColorSystemGuide] Failed to fetch tokens:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, [themeId, projectId, isDarkMode]);

  const getColorValue = (shadeName: string): string => {
    return tokens.get(shadeName) || '#CCCCCC';
  };

  const getTextColor = (bgColor: string): string => {
    // Simple luminance calculation for text contrast
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  if (loading) {
    return (
      <div className="m3-color-system-guide">
        <div className="m3-guide-loading">
          <div className="spinner" />
          <p>Loading M3 Color Roles...</p>
        </div>
      </div>
    );
  }

  const categories = ['primary', 'secondary', 'tertiary', 'error', 'surface'] as const;

  return (
    <div className="m3-color-system-guide">
      <div className="m3-guide-header">
        <h3>Material Design 3 Color Roles</h3>
        <p className="m3-guide-description">
          {isDarkMode ? 'Dark Mode' : 'Light Mode'} · Current Theme Colors
        </p>
      </div>

      <div className="m3-roles-grid">
        {categories.map((category) => {
          const categoryRoles = M3_COLOR_ROLES.filter((r) => r.category === category);

          return (
            <div key={category} className="m3-category">
              <h4 className="m3-category-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
              <div className="m3-role-list">
                {categoryRoles.map((role) => {
                  const shadeName = isDarkMode ? role.darkShade : role.lightShade;
                  const colorValue = getColorValue(shadeName);
                  const textColor = getTextColor(colorValue);

                  return (
                    <div
                      key={role.role}
                      className="m3-role-item"
                      style={{
                        backgroundColor: colorValue,
                        color: textColor,
                      }}
                    >
                      <div className="m3-role-label">{role.label}</div>
                      <div className="m3-role-value">
                        <div className="m3-shade-name">{shadeName}</div>
                        <div className="m3-color-hex">{colorValue}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="m3-guide-footer">
        <div className="m3-mapping-info">
          <h4>M3 Mapping Rules</h4>
          <ul className="m3-mapping-list">
            <li>
              <span className="mapping-label">Primary/Secondary/Tertiary:</span>
              <span className="mapping-value">{isDarkMode ? '400 shade' : '600 shade'}</span>
            </li>
            <li>
              <span className="mapping-label">Containers:</span>
              <span className="mapping-value">{isDarkMode ? '800 shade' : '100 shade'}</span>
            </li>
            <li>
              <span className="mapping-label">On-Colors:</span>
              <span className="mapping-value">{isDarkMode ? '900 or 100' : 'White or 900'}</span>
            </li>
          </ul>
        </div>

        <div className="m3-guide-link">
          <a
            href="https://m3.material.io/styles/color/roles"
            target="_blank"
            rel="noopener noreferrer"
            className="m3-docs-link"
          >
            View M3 Color Documentation →
          </a>
        </div>
      </div>
    </div>
  );
}
