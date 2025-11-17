/**
 * Settings Panel Component
 *
 * 대시보드 설정 UI
 */

import React from 'react';
import { Button, Select, SelectItem } from '../builder/components/list';
import { useSettingsStore } from '../stores/settingsStore';
import { Settings, X } from 'lucide-react';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    projectCreation,
    syncMode,
    setProjectCreation,
    setSyncMode,
    resetSettings,
  } = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <Settings size={20} />
            <h2>Settings</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onPress={onClose}
            aria-label="Close settings"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="settings-content">
          {/* 프로젝트 생성 위치 */}
          <div className="setting-item">
            <label htmlFor="project-creation">
              <strong>프로젝트 생성 위치</strong>
              <p className="setting-description">
                새 프로젝트를 어디에 생성할지 선택합니다.
              </p>
            </label>
            <Select
              id="project-creation"
              selectedKey={projectCreation}
              onSelectionChange={(key) => setProjectCreation(key as 'local' | 'cloud' | 'both')}
            >
              <SelectItem id="local" textValue="Local Only">
                <div className="select-option">
                  <strong>💾 Local Only</strong>
                  <p>로컬(IndexedDB)에만 저장 (권장)</p>
                </div>
              </SelectItem>
              <SelectItem id="cloud" textValue="Cloud Only">
                <div className="select-option">
                  <strong>☁️ Cloud Only</strong>
                  <p>클라우드(Supabase)에만 저장</p>
                </div>
              </SelectItem>
              <SelectItem id="both" textValue="Local + Cloud">
                <div className="select-option">
                  <strong>☁️💾 Local + Cloud</strong>
                  <p>양쪽 모두 저장 (느림)</p>
                </div>
              </SelectItem>
            </Select>
          </div>

          {/* 동기화 모드 */}
          <div className="setting-item">
            <label htmlFor="sync-mode">
              <strong>동기화 모드</strong>
              <p className="setting-description">
                로컬 변경사항을 클라우드에 동기화하는 방식입니다.
              </p>
            </label>
            <Select
              id="sync-mode"
              selectedKey={syncMode}
              onSelectionChange={(key) => setSyncMode(key as 'manual' | 'auto')}
            >
              <SelectItem id="manual" textValue="Manual Sync">
                <div className="select-option">
                  <strong>🔄 Manual Sync</strong>
                  <p>Sync 버튼을 눌렀을 때만 동기화 (권장)</p>
                </div>
              </SelectItem>
              <SelectItem id="auto" textValue="Auto Sync">
                <div className="select-option">
                  <strong>⚡ Auto Sync</strong>
                  <p>자동으로 주기적 동기화 (실험적)</p>
                </div>
              </SelectItem>
            </Select>
          </div>

          {/* 설명 */}
          <div className="settings-info">
            <p>
              <strong>💡 권장 설정:</strong> Local Only + Manual Sync
            </p>
            <p>
              로컬에서 빠르게 작업하고, 필요할 때만 Sync 버튼으로 클라우드에 업로드하세요.
            </p>
          </div>
        </div>

        <div className="settings-footer">
          <Button variant="ghost" size="sm" onPress={resetSettings}>
            Reset to Defaults
          </Button>
          <Button variant="primary" size="sm" onPress={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
