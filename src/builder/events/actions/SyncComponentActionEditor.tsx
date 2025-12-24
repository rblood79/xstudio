/**
 * SyncComponentActionEditor - 컴포넌트 동기화 액션 에디터
 *
 * 컴포넌트 간 데이터를 동기화하는 액션 설정
 * Phase 3: Events Panel 재설계
 */

import {
  TextField,
  Input,
  Label,
  Select,
  SelectValue,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components';

export interface SyncComponentConfig {
  /** 소스 컴포넌트 ID */
  sourceId: string;
  /** 대상 컴포넌트 ID */
  targetId: string;
  /** 동기화 모드 */
  syncMode: 'replace' | 'merge' | 'append';
  /** 동기화할 데이터 경로 (선택) */
  dataPath?: string;
  /** 양방향 동기화 여부 */
  bidirectional?: boolean;
}

interface SyncComponentActionEditorProps {
  config: SyncComponentConfig;
  onChange: (config: SyncComponentConfig) => void;
}

export function SyncComponentActionEditor({
  config,
  onChange,
}: SyncComponentActionEditorProps) {
  const syncModes = [
    { value: 'replace', label: 'Replace (덮어쓰기)' },
    { value: 'merge', label: 'Merge (병합)' },
    { value: 'append', label: 'Append (추가)' },
  ];

  return (
    <div className="action-editor-fields">
      <TextField
        value={config.sourceId}
        onChange={(value) => onChange({ ...config, sourceId: value })}
      >
        <Label className="field-label">Source Component ID</Label>
        <Input
          className="field-input"
          placeholder="e.g., #userList, component_123"
        />
      </TextField>

      <TextField
        value={config.targetId}
        onChange={(value) => onChange({ ...config, targetId: value })}
      >
        <Label className="field-label">Target Component ID</Label>
        <Input
          className="field-input"
          placeholder="e.g., #userDetails, component_456"
        />
      </TextField>

      <div className="field-group">
        <Label className="field-label">Sync Mode</Label>
        <Select
          selectedKey={config.syncMode}
          onSelectionChange={(key) =>
            onChange({ ...config, syncMode: key as SyncComponentConfig['syncMode'] })
          }
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {syncModes.map((mode) => (
                <ListBoxItem key={mode.value} id={mode.value} textValue={mode.label}>
                  {mode.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      <TextField
        value={config.dataPath ?? ''}
        onChange={(value) =>
          onChange({ ...config, dataPath: value || undefined })
        }
      >
        <Label className="field-label">Data Path (optional)</Label>
        <Input
          className="field-input"
          placeholder="e.g., selectedItem, data.items[0]"
        />
      </TextField>
    </div>
  );
}
