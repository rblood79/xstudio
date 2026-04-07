/**
 * Settings Panel Component
 *
 * 대시보드 설정 UI — Modal + Dialog 기반
 */

import React from "react";
import {
  Button,
  Dialog,
  Modal,
  Select,
  SelectItem,
  Separator,
} from "@composition/shared/components";
import { DialogTrigger, Heading } from "react-aria-components";
import { useSettingsStore } from "../stores/settingsStore";
import { Settings, Info } from "lucide-react";
import "./SettingsPanel.css";

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

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Button
        variant="secondary"
        fillStyle="outline"
        size="sm"
        aria-label="Settings"
        className="settings-trigger-hidden"
      >
        <Settings size={14} />
      </Button>
      <Modal size="md" isDismissable>
        <Dialog size="md">
          {({ close }) => (
            <>
              <div className="settings-header">
                <div className="settings-title">
                  <Settings size={18} />
                  <Heading slot="title" level={2}>
                    Settings
                  </Heading>
                </div>
              </div>

              <Separator />

              <div className="settings-content">
                {/* 프로젝트 생성 위치 */}
                <div className="setting-item">
                  <div className="setting-label">
                    <strong>Project Storage</strong>
                    <p className="setting-description">
                      Where new projects are created
                    </p>
                  </div>
                  <Select
                    selectedKey={projectCreation}
                    onSelectionChange={(key) =>
                      setProjectCreation(key as "local" | "cloud" | "both")
                    }
                    size="sm"
                  >
                    <SelectItem id="local" textValue="Local Only">
                      Local Only (IndexedDB)
                    </SelectItem>
                    <SelectItem id="cloud" textValue="Cloud Only">
                      Cloud Only (Supabase)
                    </SelectItem>
                    <SelectItem id="both" textValue="Local + Cloud">
                      Local + Cloud
                    </SelectItem>
                  </Select>
                </div>

                {/* 동기화 모드 */}
                <div className="setting-item">
                  <div className="setting-label">
                    <strong>Sync Mode</strong>
                    <p className="setting-description">
                      How local changes sync to cloud
                    </p>
                  </div>
                  <Select
                    selectedKey={syncMode}
                    onSelectionChange={(key) =>
                      setSyncMode(key as "manual" | "auto")
                    }
                    size="sm"
                  >
                    <SelectItem id="manual" textValue="Manual Sync">
                      Manual Sync
                    </SelectItem>
                    <SelectItem id="auto" textValue="Auto Sync">
                      Auto Sync (experimental)
                    </SelectItem>
                  </Select>
                </div>

                {/* 정보 */}
                <div className="settings-info">
                  <Info size={14} />
                  <span>
                    Recommended: <strong>Local Only + Manual Sync</strong>
                  </span>
                </div>
              </div>

              <Separator />

              <div className="settings-footer">
                <Button
                  variant="secondary"
                  fillStyle="outline"
                  size="sm"
                  onPress={resetSettings}
                >
                  Reset
                </Button>
                <Button variant="primary" size="sm" onPress={close}>
                  Done
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}
