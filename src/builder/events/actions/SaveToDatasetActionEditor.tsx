/**
 * SaveToDatasetActionEditor - Dataset에 저장 액션 에디터
 *
 * API 응답이나 데이터를 DataTable에 저장하는 액션 설정
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

export interface SaveToDatasetConfig {
  /** 저장할 DataTable 이름 */
  datasetName: string;
  /** 데이터 소스 */
  source: 'response' | 'variable' | 'static';
  /** 소스 경로 (response.data, variable 이름 등) */
  sourcePath?: string;
  /** 저장 모드 */
  saveMode: 'replace' | 'merge' | 'append' | 'upsert';
  /** Upsert 시 키 필드 */
  keyField?: string;
  /** 데이터 변환 표현식 (선택) */
  transform?: string;
}

interface SaveToDatasetActionEditorProps {
  config: SaveToDatasetConfig;
  onChange: (config: SaveToDatasetConfig) => void;
}

export function SaveToDatasetActionEditor({
  config,
  onChange,
}: SaveToDatasetActionEditorProps) {
  const sources = [
    { value: 'response', label: 'API Response' },
    { value: 'variable', label: 'Variable' },
    { value: 'static', label: 'Static Value' },
  ];

  const saveModes = [
    { value: 'replace', label: 'Replace (전체 교체)' },
    { value: 'merge', label: 'Merge (병합)' },
    { value: 'append', label: 'Append (추가)' },
    { value: 'upsert', label: 'Upsert (있으면 수정, 없으면 추가)' },
  ];

  return (
    <div className="action-editor-fields">
      <TextField
        value={config.datasetName}
        onChange={(value) => onChange({ ...config, datasetName: value })}
      >
        <Label className="field-label">Dataset Name</Label>
        <Input
          className="field-input"
          placeholder="e.g., users, orders"
        />
      </TextField>

      <div className="field-group">
        <Label className="field-label">Data Source</Label>
        <Select
          selectedKey={config.source}
          onSelectionChange={(key) =>
            onChange({ ...config, source: key as SaveToDatasetConfig['source'] })
          }
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {sources.map((src) => (
                <ListBoxItem key={src.value} id={src.value}>
                  {src.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      <TextField
        value={config.sourcePath ?? ''}
        onChange={(value) =>
          onChange({ ...config, sourcePath: value || undefined })
        }
      >
        <Label className="field-label">
          {config.source === 'response'
            ? 'Response Path'
            : config.source === 'variable'
            ? 'Variable Name'
            : 'Static Value'}
        </Label>
        <Input
          className="field-input"
          placeholder={
            config.source === 'response'
              ? 'e.g., data.items, result'
              : config.source === 'variable'
              ? 'e.g., apiResult, formData'
              : 'e.g., { "status": "active" }'
          }
        />
      </TextField>

      <div className="field-group">
        <Label className="field-label">Save Mode</Label>
        <Select
          selectedKey={config.saveMode}
          onSelectionChange={(key) =>
            onChange({ ...config, saveMode: key as SaveToDatasetConfig['saveMode'] })
          }
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {saveModes.map((mode) => (
                <ListBoxItem key={mode.value} id={mode.value}>
                  {mode.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      {config.saveMode === 'upsert' && (
        <TextField
          value={config.keyField ?? ''}
          onChange={(value) =>
            onChange({ ...config, keyField: value || undefined })
          }
        >
          <Label className="field-label">Key Field (for Upsert)</Label>
          <Input
            className="field-input"
            placeholder="e.g., id, email"
          />
        </TextField>
      )}

      <TextField
        value={config.transform ?? ''}
        onChange={(value) =>
          onChange({ ...config, transform: value || undefined })
        }
      >
        <Label className="field-label">Transform Expression (optional)</Label>
        <Input
          className="field-input"
          placeholder="e.g., items.map(i => ({ ...i, status: 'saved' }))"
        />
      </TextField>
    </div>
  );
}
