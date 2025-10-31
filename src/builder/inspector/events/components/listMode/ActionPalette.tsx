/**
 * ActionPalette - 액션 선택 팔레트
 */

import { useState } from "react";
import { Button } from "react-aria-components";
import { ACTION_METADATA, ACTION_CATEGORIES, getRecommendedActions } from "../../data/actionMetadata";
import type { ActionType, EventAction } from "../../types";

export interface ActionPaletteProps {
  eventType?: string;
  componentType?: string;
  previousAction?: ActionType;
  onAddAction: (actionType: ActionType) => void;
  onCancel?: () => void;
}

/**
 * ActionPalette Component
 *
 * 액션 타입을 선택할 수 있는 팔레트 UI
 *
 * Features:
 * - 카테고리별 그룹화
 * - 추천 액션 표시
 * - 액션 메타데이터 표시 (아이콘, 레이블, 설명)
 */
export function ActionPalette({
  eventType,
  componentType,
  previousAction,
  onAddAction,
  onCancel
}: ActionPaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 추천 액션
  const recommendedActionTypes = getRecommendedActions({
    previousAction,
    eventType,
    componentType
  });

  const categoryLabels: Record<string, string> = {
    navigation: "🔗 Navigation",
    state: "💾 State Management",
    api: "🌐 API",
    ui: "📱 UI Interaction",
    form: "📝 Form",
    utility: "⚙️ Utility"
  };

  const categoryDescriptions: Record<string, string> = {
    navigation: "페이지 이동 및 스크롤",
    state: "애플리케이션 상태 관리",
    api: "API 요청 및 데이터 로드",
    ui: "모달, 토스트, 요소 표시/숨김",
    form: "폼 검증, 제출, 리셋",
    utility: "클립보드, 커스텀 함수"
  };

  return (
    <div className="action-palette">
      <div className="action-palette-header">
        <h6 className="action-palette-title">Select Action Type</h6>
        {onCancel && (
          <Button
            className="react-aria-Button cancel-button"
            onPress={onCancel}
          >
            ✕
          </Button>
        )}
      </div>

      {/* 추천 액션 */}
      {recommendedActionTypes.length > 0 && (
        <div className="recommended-actions">
          <div className="recommended-header">
            <span className="recommended-icon">⭐</span>
            <span className="recommended-label">Recommended</span>
          </div>
          <div className="recommended-list">
            {recommendedActionTypes.map((actionType) => {
              const metadata = ACTION_METADATA[actionType];
              return (
                <Button
                  key={actionType}
                  className="recommended-action-button"
                  onPress={() => onAddAction(actionType)}
                >
                  <span className="action-icon">{metadata.icon}</span>
                  <span className="action-name">{metadata.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* 카테고리 */}
      <div className="action-categories">
        {Object.entries(ACTION_CATEGORIES).map(([category, actionTypes]) => {
          const isExpanded = selectedCategory === category;

          return (
            <div key={category} className="action-category">
              <Button
                className="category-header"
                onPress={() => setSelectedCategory(isExpanded ? null : category)}
              >
                <div className="category-info">
                  <span className="category-label">{categoryLabels[category]}</span>
                  <span className="category-description">
                    {categoryDescriptions[category]}
                  </span>
                </div>
                <span className="category-toggle">
                  {isExpanded ? "−" : "+"}
                </span>
              </Button>

              {isExpanded && (
                <div className="category-actions">
                  {(actionTypes as readonly ActionType[]).map((actionType) => {
                    const metadata = ACTION_METADATA[actionType];
                    return (
                      <Button
                        key={actionType}
                        className="action-item"
                        onPress={() => onAddAction(actionType)}
                      >
                        <span className="action-icon">{metadata.icon}</span>
                        <div className="action-info">
                          <div className="action-label">{metadata.label}</div>
                          <div className="action-description">
                            {metadata.description}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
