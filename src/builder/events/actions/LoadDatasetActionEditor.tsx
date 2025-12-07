/**
 * LoadDatasetActionEditor - Dataset 로드 액션 에디터
 *
 * DataTable을 로드하거나 리프레시하는 액션 설정
 * Phase 3: Events Panel 재설계
 */

import { TextField, Input, Label, Switch } from 'react-aria-components';

export interface LoadDatasetConfig {
  /** 로드할 DataTable 이름 */
  datasetName: string;
  /** 강제 새로고침 여부 */
  forceRefresh?: boolean;
  /** 캐시 TTL (초) */
  cacheTTL?: number;
  /** 결과를 저장할 변수 */
  targetVariable?: string;
}

interface LoadDatasetActionEditorProps {
  config: LoadDatasetConfig;
  onChange: (config: LoadDatasetConfig) => void;
}

export function LoadDatasetActionEditor({
  config,
  onChange,
}: LoadDatasetActionEditorProps) {
  return (
    <div className="action-editor-fields">
      <TextField
        value={config.datasetName}
        onChange={(value) => onChange({ ...config, datasetName: value })}
      >
        <Label className="field-label">Dataset Name</Label>
        <Input className="field-input" placeholder="e.g., users, products" />
      </TextField>

      <div className="field-row">
        <Switch
          isSelected={config.forceRefresh ?? false}
          onChange={(checked) => onChange({ ...config, forceRefresh: checked })}
        >
          <span className="switch-label">Force Refresh</span>
        </Switch>
        <span className="field-hint">Bypass cache and fetch fresh data</span>
      </div>

      <TextField
        value={String(config.cacheTTL ?? '')}
        onChange={(value) =>
          onChange({
            ...config,
            cacheTTL: value ? parseInt(value, 10) : undefined,
          })
        }
      >
        <Label className="field-label">Cache TTL (seconds)</Label>
        <Input
          className="field-input"
          type="number"
          min={0}
          placeholder="e.g., 300 (5 minutes)"
        />
      </TextField>

      <TextField
        value={config.targetVariable ?? ''}
        onChange={(value) =>
          onChange({ ...config, targetVariable: value || undefined })
        }
      >
        <Label className="field-label">Store Result In (optional)</Label>
        <Input
          className="field-input"
          placeholder="e.g., loadedUsers"
        />
      </TextField>
    </div>
  );
}
