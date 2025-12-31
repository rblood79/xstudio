/**
 * DataTable 컴포넌트 메타데이터
 * Builder에서 사용
 *
 * Fast refresh 최적화를 위해 별도 파일로 분리
 */

export const DataTableMetadata = {
  name: 'DataTable',
  displayName: '데이터테이블',
  category: 'Data',
  description: '중앙 집중식 데이터 관리 컴포넌트',
  icon: 'Database',
  isNonVisual: true, // Preview에서 렌더링하지 않음
  defaultProps: {
    id: '',
    name: '',
    autoLoad: true,
  },
  propDefinitions: {
    id: {
      type: 'string',
      label: 'DataTable ID',
      description: '다른 컴포넌트에서 참조할 고유 ID',
      required: true,
    },
    name: {
      type: 'string',
      label: '이름',
      description: '표시용 이름',
    },
    description: {
      type: 'string',
      label: '설명',
      description: '데이터테이블 용도 설명',
    },
    autoLoad: {
      type: 'boolean',
      label: '자동 로드',
      description: '컴포넌트 마운트 시 자동으로 데이터 로드',
      defaultValue: true,
    },
    refreshInterval: {
      type: 'number',
      label: '새로고침 간격',
      description: '자동 새로고침 간격 (ms, 0이면 비활성화)',
    },
  },
};
