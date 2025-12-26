# Builder Components 통합 계획

## 개요

현재 builder 내 공통 컴포넌트들이 두 곳에 분산되어 있어 관리 및 사용에 혼란이 발생하고 있습니다.
이 문서는 `src/builder/components`와 `src/builder/panels/common`을 통합하는 계획을 정의합니다.

## 현재 구조 분석

### `src/builder/components/` (7개 파일)

| 파일 | 설명 | 분류 |
|------|------|------|
| `AddPageDialog.tsx` | 페이지 추가 다이얼로그 | Dialog |
| `AddPageDialog.css` | 다이얼로그 스타일 | Dialog |
| `DataTable.tsx` | 데이터 테이블 컴포넌트 | Data |
| `DataTableMetadata.ts` | 데이터 테이블 메타데이터 | Data |
| `ScopedErrorBoundary.tsx` | 에러 바운더리 | Feedback |
| `Toast.tsx` | 토스트 알림 | Feedback |
| `ToastContainer.tsx` | 토스트 컨테이너 | Feedback |
| `styles/Toast.css` | 토스트 스타일 | Feedback |
| `styles/ScopedErrorBoundary.css` | 에러 바운더리 스타일 | Feedback |

### `src/builder/panels/common/` (22개 파일)

| 파일 | 설명 | 분류 |
|------|------|------|
| `PropertyInput.tsx` | 텍스트 입력 프로퍼티 | Property |
| `PropertySelect.tsx` | 선택 프로퍼티 | Property |
| `PropertyCheckbox.tsx` | 체크박스 프로퍼티 | Property |
| `PropertySwitch.tsx` | 스위치 프로퍼티 | Property |
| `PropertySlider.tsx` | 슬라이더 프로퍼티 | Property |
| `PropertyColor.tsx` | 색상 프로퍼티 | Property |
| `PropertyColorPicker.tsx` | 색상 피커 프로퍼티 | Property |
| `PropertyUnitInput.tsx` | 단위 입력 프로퍼티 | Property |
| `PropertySection.tsx` | 프로퍼티 섹션 | Property |
| `PropertyFieldset.tsx` | 프로퍼티 필드셋 | Property |
| `PropertyCustomId.tsx` | 커스텀 ID 프로퍼티 | Property |
| `PropertyDataBinding.tsx` | 데이터 바인딩 프로퍼티 | Property |
| `PropertyDataBinding.css` | 데이터 바인딩 스타일 | Property |
| `PanelHeader.tsx` | 패널 헤더 | Panel |
| `SectionHeader.tsx` | 섹션 헤더 | Panel |
| `EmptyState.tsx` | 빈 상태 표시 | Feedback |
| `LoadingSpinner.tsx` | 로딩 스피너 | Feedback |
| `MultiSelectStatusIndicator.tsx` | 다중 선택 상태 표시 | Selection |
| `BatchPropertyEditor.tsx` | 일괄 프로퍼티 편집 | Selection |
| `SelectionFilter.tsx` | 선택 필터 | Selection |
| `SelectionMemory.tsx` | 선택 메모리 | Selection |
| `SmartSelection.tsx` | 스마트 선택 | Selection |
| `KeyboardShortcutsHelp.tsx` | 키보드 단축키 도움말 | Help |
| `index.ts` | 통합 export | - |
| `index.css` | 공통 스타일 | - |
| `list-group.css` | 리스트 그룹 스타일 | - |

## 문제점

1. **일관성 부족**: 공통 컴포넌트를 찾을 때 두 곳을 확인해야 함
2. **명확한 기준 부재**: 새 컴포넌트를 어디에 추가해야 하는지 모호함
3. **import 경로 복잡**: 사용처마다 다른 경로로 import
4. **유지보수 어려움**: 관련 컴포넌트가 분산되어 있어 수정 시 누락 가능성

## 통합 목표

- 모든 builder 공통 컴포넌트를 `src/builder/components/`에서 관리
- 성격에 따라 하위 폴더로 분류하여 가독성 확보
- 통합 `index.ts`를 통한 일관된 import 경로 제공

## 제안 구조

```
src/builder/components/
├── property/                    # 프로퍼티 편집 컴포넌트
│   ├── PropertyInput.tsx
│   ├── PropertySelect.tsx
│   ├── PropertyCheckbox.tsx
│   ├── PropertySwitch.tsx
│   ├── PropertySlider.tsx
│   ├── PropertyColor.tsx
│   ├── PropertyColorPicker.tsx
│   ├── PropertyUnitInput.tsx
│   ├── PropertySection.tsx
│   ├── PropertyFieldset.tsx
│   ├── PropertyCustomId.tsx
│   ├── PropertyDataBinding.tsx
│   ├── PropertyDataBinding.css
│   └── index.ts
│
├── panel/                       # 패널 관련 컴포넌트
│   ├── PanelHeader.tsx
│   ├── SectionHeader.tsx
│   └── index.ts
│
├── selection/                   # 선택 관련 컴포넌트
│   ├── MultiSelectStatusIndicator.tsx
│   ├── BatchPropertyEditor.tsx
│   ├── SelectionFilter.tsx
│   ├── SelectionMemory.tsx
│   ├── SmartSelection.tsx
│   └── index.ts
│
├── feedback/                    # 피드백/상태 표시 컴포넌트
│   ├── Toast.tsx
│   ├── ToastContainer.tsx
│   ├── Toast.css
│   ├── EmptyState.tsx
│   ├── LoadingSpinner.tsx
│   ├── ScopedErrorBoundary.tsx
│   ├── ScopedErrorBoundary.css
│   └── index.ts
│
├── dialog/                      # 다이얼로그 컴포넌트
│   ├── AddPageDialog.tsx
│   ├── AddPageDialog.css
│   └── index.ts
│
├── data/                        # 데이터 관련 컴포넌트
│   ├── DataTable.tsx
│   ├── DataTableMetadata.ts
│   └── index.ts
│
├── help/                        # 도움말 관련 컴포넌트
│   ├── KeyboardShortcutsHelp.tsx
│   └── index.ts
│
├── styles/                      # 공통 스타일
│   ├── index.css
│   └── list-group.css
│
└── index.ts                     # 통합 export
```

## 마이그레이션 단계

### Phase 1: 폴더 구조 생성
- [ ] `src/builder/components/` 하위에 분류별 폴더 생성
  - `property/`, `panel/`, `selection/`, `feedback/`, `dialog/`, `data/`, `help/`, `styles/`

### Phase 2: 파일 이동
- [ ] `panels/common/`의 Property* 컴포넌트들 → `components/property/`
- [ ] `panels/common/`의 PanelHeader, SectionHeader → `components/panel/`
- [ ] `panels/common/`의 Selection*, Batch*, MultiSelect* → `components/selection/`
- [ ] `panels/common/`의 EmptyState, LoadingSpinner → `components/feedback/`
- [ ] `panels/common/`의 KeyboardShortcutsHelp → `components/help/`
- [ ] 기존 `components/`의 Toast*, ScopedErrorBoundary → `components/feedback/`
- [ ] 기존 `components/`의 AddPageDialog → `components/dialog/`
- [ ] 기존 `components/`의 DataTable* → `components/data/`
- [ ] 스타일 파일들 정리 → `components/styles/` 또는 각 폴더 내

### Phase 3: Export 설정
- [ ] 각 하위 폴더에 `index.ts` 생성
- [ ] 루트 `components/index.ts`에서 모든 컴포넌트 re-export

### Phase 4: Import 경로 업데이트
- [ ] `panels/common`을 import하는 모든 파일 검색
- [ ] import 경로를 `builder/components`로 변경

### Phase 5: 정리
- [ ] `src/builder/panels/common/` 폴더 삭제
- [ ] 빌드 및 테스트 검증

## Import 경로 변경 예시

### Before
```typescript
// 분산된 import
import { PropertyInput, PropertySelect } from '../panels/common';
import { Toast } from '../components/Toast';
import { EmptyState } from '../panels/common/EmptyState';
```

### After
```typescript
// 통합된 import
import {
  PropertyInput,
  PropertySelect,
  Toast,
  EmptyState
} from '../components';

// 또는 카테고리별 import
import { PropertyInput, PropertySelect } from '../components/property';
import { Toast, EmptyState } from '../components/feedback';
```

## 영향 범위 분석

### 예상 수정 파일
- `src/builder/panels/` 하위 패널 컴포넌트들
- `src/builder/canvas/` 일부 컴포넌트
- 기타 builder 내 common 컴포넌트 사용처

### 리스크
- Import 경로 변경으로 인한 빌드 오류 가능성
- 순환 참조 발생 가능성 (의존성 분석 필요)

## 검증 체크리스트

- [ ] TypeScript 빌드 성공
- [ ] 모든 컴포넌트 정상 렌더링
- [ ] 기존 기능 동작 확인
- [ ] 순환 참조 없음 확인

## 일정

| 단계 | 예상 작업량 |
|------|------------|
| Phase 1 | 폴더 구조 생성 |
| Phase 2 | 파일 이동 |
| Phase 3 | Export 설정 |
| Phase 4 | Import 경로 업데이트 |
| Phase 5 | 정리 및 검증 |

## 참고사항

- 이 작업은 기능 변경 없이 구조만 개선하는 리팩토링입니다
- 각 Phase 완료 후 빌드 검증을 권장합니다
- Git 커밋은 Phase별로 분리하여 롤백 용이성을 확보합니다
