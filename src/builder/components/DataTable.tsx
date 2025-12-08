/**
 * DataTable Component
 *
 * 중앙 집중식 데이터 관리를 위한 비시각적 컴포넌트
 * Layer Tree에는 표시되지만 Preview에서는 렌더링되지 않음
 *
 * 사용 예:
 * <DataTable
 *   id="users-datatable"
 *   name="Users"
 *   dataBinding={{
 *     type: "collection",
 *     source: "api",
 *     config: {
 *       baseUrl: "MOCK_DATA",
 *       endpoint: "/users",
 *       dataMapping: { resultPath: "data" }
 *     }
 *   }}
 * />
 *
 * 다른 컴포넌트에서 참조:
 * <ListBox dataTableId="users-datatable" />
 * <Select dataTableId="users-datatable" />
 *
 * @see docs/PLANNED_FEATURES.md - DataTable Component Architecture
 */

import { memo, useEffect, useRef } from 'react';
import type { DataTableProps } from '../../types/datatable.types';
import { useDataTableStore } from '../stores/datatable';

/**
 * DataTable 컴포넌트
 *
 * 데이터 소스를 중앙에서 관리하고 여러 컴포넌트가 공유할 수 있도록 함
 * 이 컴포넌트는 UI를 렌더링하지 않음 (null 반환)
 */
export const DataTable = memo(function DataTable({
  id,
  name,
  dataBinding,
  description,
  refreshInterval,
  autoLoad = true,
}: DataTableProps) {
  const registerDataTable = useDataTableStore((state) => state.registerDataTable);
  const unregisterDataTable = useDataTableStore((state) => state.unregisterDataTable);
  const loadDataTable = useDataTableStore((state) => state.loadDataTable);
  const updateDataTableConfig = useDataTableStore((state) => state.updateDataTableConfig);

  // 이전 값 추적
  const prevDataBindingRef = useRef<typeof dataBinding>(undefined);
  const isInitialMount = useRef(true);

  // DataTable 등록 (마운트 시)
  useEffect(() => {
    if (!id) {
      console.warn('⚠️ DataTable: id prop is required');
      return;
    }

    if (!dataBinding) {
      console.warn(`⚠️ DataTable ${id}: dataBinding prop is required`);
      return;
    }

    // DataTable 설정 등록
    registerDataTable({
      id,
      name: name || id,
      dataBinding,
      description,
      refreshInterval,
      useCache: true,
      cacheTTL: 5 * 60 * 1000, // 5분
    });

    // 자동 로드
    if (autoLoad) {
      loadDataTable(id);
    }

    // 언마운트 시 DataTable 제거
    return () => {
      unregisterDataTable(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // id만 의존성으로 - 마운트/언마운트 시에만 실행 (의도적으로 다른 의존성 제외)

  // dataBinding 변경 감지 및 업데이트
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevDataBindingRef.current = dataBinding;
      return;
    }

    // dataBinding이 실제로 변경되었는지 확인
    const prevJson = JSON.stringify(prevDataBindingRef.current);
    const currentJson = JSON.stringify(dataBinding);

    if (prevJson !== currentJson && dataBinding) {
      console.log(`🔄 DataTable ${id}: dataBinding changed, updating...`);
      updateDataTableConfig(id, { dataBinding });

      // 데이터 다시 로드
      if (autoLoad) {
        loadDataTable(id);
      }

      prevDataBindingRef.current = dataBinding;
    }
  }, [dataBinding, id, autoLoad, updateDataTableConfig, loadDataTable]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    console.log(`⏱️ DataTable ${id}: Auto-refresh every ${refreshInterval}ms`);

    const intervalId = setInterval(() => {
      loadDataTable(id);
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [id, refreshInterval, loadDataTable]);

  // 비시각적 컴포넌트 - UI 렌더링 없음
  return null;
});

/**
 * DataTable 컴포넌트 메타데이터
 * Builder에서 사용
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

export default DataTable;
