/**
 * AISettings - AI 프로바이더/모델 선택 + API 키 입력 UI
 *
 * Pencil처럼 사용자가 직접 API 키를 입력하는 방식
 * localStorage에 영구 저장
 */

import { useState, useCallback } from 'react';
import { Settings, Eye, EyeOff, Check, X, ChevronDown } from 'lucide-react';
import {
  useAISettingsStore,
  AI_PROVIDERS,
  AI_MODELS,
  type AIProviderType,
} from '../../../stores/aiSettings';

export function AISettingsButton() {
  const { toggleSettings, isConfigured, provider } = useAISettingsStore();
  const providerInfo = AI_PROVIDERS[provider];

  return (
    <button
      className="ai-settings-btn"
      onClick={toggleSettings}
      type="button"
      title="AI 설정"
    >
      <Settings size={14} strokeWidth={1.5} />
      <span className="ai-settings-btn-label">
        {isConfigured ? providerInfo.label.split(' ')[0] : 'API 키 필요'}
      </span>
      {isConfigured && <span className="ai-settings-indicator" />}
    </button>
  );
}

export function AISettingsPanel() {
  const {
    provider,
    modelId,
    apiKeys,
    showSettings,
    setProvider,
    setModelId,
    setApiKey,
    clearApiKey,
    setShowSettings,
  } = useAISettingsStore();

  const [showKey, setShowKey] = useState(false);
  const [editingKey, setEditingKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const currentKey = apiKeys[provider] ?? '';
  const providerInfo = AI_PROVIDERS[provider];
  const modelsForProvider = AI_MODELS.filter((m) => m.provider === provider);

  const handleStartEdit = useCallback(() => {
    setEditingKey(currentKey);
    setIsEditing(true);
  }, [currentKey]);

  const handleSaveKey = useCallback(() => {
    const trimmed = editingKey.trim();
    if (trimmed) {
      setApiKey(provider, trimmed);
    } else {
      clearApiKey(provider);
    }
    setIsEditing(false);
    setEditingKey('');
  }, [editingKey, provider, setApiKey, clearApiKey]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingKey('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveKey();
    if (e.key === 'Escape') handleCancelEdit();
  }, [handleSaveKey, handleCancelEdit]);

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '...' + key.slice(-4);
  };

  if (!showSettings) return null;

  return (
    <div className="ai-settings-panel">
      <div className="ai-settings-header">
        <h3>AI Settings</h3>
        <button
          className="ai-settings-close"
          onClick={() => setShowSettings(false)}
          type="button"
          aria-label="설정 닫기"
        >
          <X size={14} />
        </button>
      </div>

      {/* Provider 선택 */}
      <div className="ai-settings-field">
        <label>Provider</label>
        <div className="ai-settings-select-wrapper">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProviderType)}
          >
            {(Object.entries(AI_PROVIDERS) as [AIProviderType, { label: string }][]).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="ai-settings-select-icon" />
        </div>
      </div>

      {/* 모델 선택 */}
      <div className="ai-settings-field">
        <label>Model</label>
        <div className="ai-settings-select-wrapper">
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
          >
            {modelsForProvider.map((model) => (
              <option key={model.id} value={model.id}>{model.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="ai-settings-select-icon" />
        </div>
      </div>

      {/* API 키 입력 */}
      <div className="ai-settings-field">
        <label>API Key</label>
        {isEditing ? (
          <div className="ai-settings-key-edit">
            <input
              type={showKey ? 'text' : 'password'}
              value={editingKey}
              onChange={(e) => setEditingKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={providerInfo.placeholder}
              autoFocus
            />
            <div className="ai-settings-key-actions">
              <button onClick={() => setShowKey(!showKey)} type="button" title={showKey ? '숨기기' : '보기'}>
                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button onClick={handleSaveKey} type="button" title="저장" className="ai-settings-save">
                <Check size={12} />
              </button>
              <button onClick={handleCancelEdit} type="button" title="취소">
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div className="ai-settings-key-display">
            <span className={currentKey ? 'ai-key-set' : 'ai-key-empty'}>
              {currentKey ? maskKey(currentKey) : '미설정'}
            </span>
            <button
              className="ai-settings-edit-btn"
              onClick={handleStartEdit}
              type="button"
            >
              {currentKey ? '변경' : '입력'}
            </button>
          </div>
        )}
      </div>

      {!currentKey && (
        <p className="ai-settings-hint">
          API 키를 입력하면 AI 어시스턴트를 사용할 수 있습니다.
        </p>
      )}
    </div>
  );
}
