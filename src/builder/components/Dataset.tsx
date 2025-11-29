/**
 * Dataset Component
 *
 * 중앙 집중식 데이터 관리를 위한 비시각적 컴포넌트
 * Layer Tree에는 표시되지만 Preview에서는 렌더링되지 않음
 *
 * 사용 예:
 * <Dataset
 *   id="users-dataset"
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
 * <ListBox datasetId="users-dataset" />
 * <Select datasetId="users-dataset" />
 *
 * @see docs/PLANNED_FEATURES.md - Dataset Component Architecture
 */

import { memo, useEffect, useRef } from 'react';
import type { DatasetProps } from '../../types/dataset.types';
import { useDatasetStore } from '../stores/dataset';

/**
 * Dataset 컴포넌트
 *
 * 데이터 소스를 중앙에서 관리하고 여러 컴포넌트가 공유할 수 있도록 함
 * 이 컴포넌트는 UI를 렌더링하지 않음 (null 반환)
 */
export const Dataset = memo(function Dataset({
  id,
  name,
  dataBinding,
  description,
  refreshInterval,
  autoLoad = true,
}: DatasetProps) {
  const registerDataset = useDatasetStore((state) => state.registerDataset);
  const unregisterDataset = useDatasetStore((state) => state.unregisterDataset);
  const loadDataset = useDatasetStore((state) => state.loadDataset);
  const updateDatasetConfig = useDatasetStore((state) => state.updateDatasetConfig);

  // 이전 값 추적
  const prevDataBindingRef = useRef<typeof dataBinding>(undefined);
  const isInitialMount = useRef(true);

  // Dataset 등록 (마운트 시)
  useEffect(() => {
    if (!id) {
      console.warn('⚠️ Dataset: id prop is required');
      return;
    }

    if (!dataBinding) {
      console.warn(`⚠️ Dataset ${id}: dataBinding prop is required`);
      return;
    }

    // Dataset 설정 등록
    registerDataset({
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
      loadDataset(id);
    }

    // 언마운트 시 Dataset 제거
    return () => {
      unregisterDataset(id);
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
      console.log(`🔄 Dataset ${id}: dataBinding changed, updating...`);
      updateDatasetConfig(id, { dataBinding });

      // 데이터 다시 로드
      if (autoLoad) {
        loadDataset(id);
      }

      prevDataBindingRef.current = dataBinding;
    }
  }, [dataBinding, id, autoLoad, updateDatasetConfig, loadDataset]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    console.log(`⏱️ Dataset ${id}: Auto-refresh every ${refreshInterval}ms`);

    const intervalId = setInterval(() => {
      loadDataset(id);
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [id, refreshInterval, loadDataset]);

  // 비시각적 컴포넌트 - UI 렌더링 없음
  return null;
});

/**
 * Dataset 컴포넌트 메타데이터
 * Builder에서 사용
 */
export const DatasetMetadata = {
  name: 'Dataset',
  displayName: '데이터셋',
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
      label: 'Dataset ID',
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
      description: '데이터셋 용도 설명',
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

export default Dataset;
