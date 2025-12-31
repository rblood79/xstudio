/**
 * DataSourceNode - 데이터 소스를 나타내는 ReactFlow 노드
 *
 * DataTable, API, Supabase, Mock 데이터 소스 표시
 */

import { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, Globe, Cloud, TestTube } from 'lucide-react';
import type { DataSourceNodeData } from '../types';

interface DataSourceNodeProps {
  data: DataSourceNodeData;
  selected?: boolean;
}

const SOURCE_ICONS = {
  dataTable: Database,
  api: Globe,
  supabase: Cloud,
  mock: TestTube,
} as const;

const getSourceLabel = (sourceType: string) => {
  switch (sourceType) {
    case 'dataTable':
      return 'DataTable';
    case 'api':
      return 'API';
    case 'supabase':
      return 'Supabase';
    case 'mock':
      return 'Mock';
    default:
      return 'Data';
  }
};

export const DataSourceNode = memo(function DataSourceNode({
  data,
  selected,
}: DataSourceNodeProps) {
  const { dataSource, pageIds } = data;
  const Icon = useMemo(() =>
    SOURCE_ICONS[dataSource.sourceType as keyof typeof SOURCE_ICONS] || Database,
    [dataSource.sourceType]
  );

  return (
    <div
      className={`workflow-node workflow-datasource-node workflow-datasource-${dataSource.sourceType} ${selected ? 'selected' : ''}`}
    >
      {/* Header */}
      <div className="workflow-node-header">
        <Icon size={14} className="workflow-node-icon" />
        <span className="workflow-node-title">{dataSource.name}</span>
      </div>

      {/* Content */}
      <div className="workflow-node-content">
        <div className="workflow-node-type">
          {getSourceLabel(dataSource.sourceType)}
        </div>

        <div className="workflow-node-stats">
          {/* Bound Elements Count */}
          <div className="workflow-stat" title="Bound elements">
            <span>{dataSource.boundElements.length} elements</span>
          </div>

          {/* Pages Count */}
          <div className="workflow-stat" title="Pages using this data">
            <span>{pageIds.length} pages</span>
          </div>
        </div>
      </div>

      {/* Output Handle (for data binding to pages) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="workflow-handle workflow-handle-source"
      />
    </div>
  );
});

export default DataSourceNode;
