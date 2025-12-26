/**
 * ThemesPanel - 테마 관리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 활성 테마 정보 표시 및 Theme Studio 접근 제공
 */

import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { Palette, SwatchBook } from 'lucide-react';
import { iconProps } from '../../../utils/ui/uiConstants';
import type { PanelProps } from '../core/types';
import { useUnifiedThemeStore } from '../../../stores/themeStore';
import {
  PanelHeader,
  PropertySection,
  PropertyInput,
  EmptyState,
} from '../../components';
import { Button } from 'react-aria-components';
import './ThemesPanel.css';

function ThemesContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const activeTheme = useUnifiedThemeStore((state) => state.activeTheme);
  const tokens = useUnifiedThemeStore((state) => state.tokens);

  // Format token value (handle objects)
  const formatTokenValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // Group tokens by type
  const tokensByType = useMemo(() => {
    const grouped: Record<string, Array<{ name: string; value: string }>> = {};

    tokens.forEach((token) => {
      const type = token.type || 'other';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push({
        name: token.name,
        value: formatTokenValue(token.value),
      });
    });

    return grouped;
  }, [tokens]);

  // Get type display name
  const getTypeDisplayName = (type: string): string => {
    const typeMap: Record<string, string> = {
      color: 'Colors',
      spacing: 'Spacing',
      borderRadius: 'Border Radius',
      fontSize: 'Font Size',
      fontWeight: 'Font Weight',
      lineHeight: 'Line Height',
      shadow: 'Shadows',
      other: 'Other',
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleOpenThemeStudio = () => {
    if (projectId) {
      window.open(`/theme/${projectId}`, '_blank');
    }
  };

  if (!projectId) {
    return <EmptyState message="Project ID is required" />;
  }

  if (!activeTheme) {
    return (
      <div className="themes-panel">
        <PanelHeader
          icon={<SwatchBook size={iconProps.size} />}
          title="Themes"
          actions={
            <Button
              onPress={handleOpenThemeStudio}
              className="iconButton"
            >
              <Palette size={iconProps.size} />
            </Button>
          }
        />
        <EmptyState
          message="No active theme"
          description="Select a theme in Settings or create one in Theme Studio"
        />
      </div>
    );
  }

  return (
    <div className="themes-panel">
      <PanelHeader
        icon={<SwatchBook size={iconProps.size} />}
        title="Themes"
        actions={
          <Button
            onPress={handleOpenThemeStudio}
            className="iconButton"
          >
            <Palette size={iconProps.size} />
          </Button>
        }
      />

      <PropertySection title="Active Theme">
        <PropertyInput
          label="Theme Name"
          value={activeTheme.name || ''}
          onChange={() => {}}
          disabled
          placeholder="Theme name"
        />

        <PropertyInput
          label="Version"
          value={activeTheme.version || '1.0'}
          onChange={() => {}}
          disabled
          placeholder="Version"
        />

        <PropertyInput
          label="Status"
          value={activeTheme.status || 'active'}
          onChange={() => {}}
          disabled
          placeholder="Status"
        />
      </PropertySection>

      {/* Render token sections by type */}
      {Object.keys(tokensByType).length === 0 ? (
        <PropertySection title="Theme Tokens">
          <EmptyState
            message="No custom tokens defined"
            description="Create tokens in Theme Studio to customize your theme"
          />
          <Button
            onPress={handleOpenThemeStudio}
          >
            <Palette size={iconProps.size} />
          </Button>
        </PropertySection>
      ) : (
        <>
          {Object.entries(tokensByType).map(([type, typeTokens]) => (
            <PropertySection key={type} title={getTypeDisplayName(type)}>
              {typeTokens.map((token) => (
                <PropertyInput
                  key={token.name}
                  label={token.name}
                  value={token.value}
                  onChange={() => {}}
                  disabled
                  placeholder="Not set"
                />
              ))}
            </PropertySection>
          ))}

          {/* Theme Studio button at the end */}
          <PropertySection title="Advanced Editing">
            <Button
              onPress={handleOpenThemeStudio}
              className="iconButton"
            >
              <Palette size={iconProps.size} />
              Manage All Tokens in Theme Studio
            </Button>
          </PropertySection>
        </>
      )}
    </div>
  );
}

export function ThemesPanel({ isActive }: PanelProps) {
  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  return <ThemesContent />;
}
