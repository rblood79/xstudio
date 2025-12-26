# 히스토리 패널 설계/구현 메모

Photoshop Web 벤치마크 기반으로 정리한 히스토리 패널의 설계와 현재 구현(로컬 변경 기준)을 문서화합니다.
이번 보완에는 공개 자료(Photoshop Desktop 중심) 참고 내용을 포함합니다. Web 전용 차이는 추가 검증이 필요합니다.

## 목표

- Photoshop History 패널의 핵심 UX(선형 스택, 현재 상태 강조, 클릭 복원) 적용
- xstudio의 diff 기반 히스토리 구조에 맞춘 요약 라벨/정보 제공
- Undo/Redo와 동일한 동작을 패널에서도 제공해 일관성 확보

## 벤치마크 인사이트 요약

- 히스토리는 단일 선형 스택이며 과거로 이동 후 새 작업 시 미래(redo 구간)가 삭제됨.
- 연속 조작은 “커밋 시점” 기준으로 1개 항목으로 기록되는 경향.
- 현재 상태를 강하게 강조하고, 미래 상태는 비활성/회색 처리.
- 개별 항목 삭제는 제한적이며, “Clear History” 방식이 일반적.
- 요약 라벨은 “동작 + 대상(레이어/오브젝트)” 수준이 중심.
- 히스토리(세션)와 버전 히스토리는 분리되는 패턴이 일반적.

## 리서치 출처 (Web 확인 전 단계)

아래는 Photoshop Desktop 기반의 공개 자료이며, Web 버전과 동일하지 않을 수 있습니다.

- History 패널 기본 개념, History States vs Snapshots, History State limit 언급
  - https://www.bwillcreative.com/how-to-use-the-history-panel-in-photoshop/
- History States 개념, 기본 상태 수(50), Performance Preferences에서 1~1000 조정, Snapshot/History Brush 동작
  - https://retouchingacademy.com/photoshop-basics-getting-to-know-the-history-panel/
- History 패널 리스트 구조(초기 상태부터 기록, 클릭으로 undo/redo 경로 이동)
  - https://www.psdvault.com/basics/beginners-guide-history-panel-photoshop/

## 출처 기반 관찰 (요약)

- History Panel은 작업 세션의 모든 변경을 시간 순 리스트로 표시한다.
- History States는 각 작업 단위를 의미하며, 리스트 클릭으로 해당 시점으로 되돌릴 수 있다.
- 상태 수는 제한이 있으며, 기본값(예: 50)에서 환경설정으로 늘릴 수 있다.
- Snapshots는 특정 상태를 고정 저장하는 방법이며, History States가 삭제되더라도 보존된다.
- History Brush는 특정 History State를 기준으로 일부 영역만 되돌리는 방식이다.

## 설계 확장 (xstudio)

### 범위

- 세션 히스토리(Undo/Redo 기반)만 다룸
- 버전 히스토리(저장/배포 단위)는 별도 기능으로 분리

### 비목표

- 비선형 히스토리(브랜치 유지) 제공은 초기 범위에서 제외
- 개별 항목 삭제는 스택 무결성 때문에 제외

### 사용자 플로우

1) 변경 발생 → 히스토리 항목 추가  
2) 사용자가 리스트에서 과거 항목 클릭 → 해당 시점으로 복원  
3) 과거 상태에서 새 변경 발생 → 미래(redo 구간) 삭제  
4) Clear 실행 → 현재 페이지 히스토리 초기화  

### 상태 모델

- `entries[]`: 시간순 히스토리 항목
- `currentIndex`: 현재 위치 포인터
- `totalEntries`: 전체 항목 수
- 정책: `currentIndex` 이후 항목은 “미래”로 간주

### 리스트 표시 규칙

- 최신 항목이 상단에 노출
- 현재 상태 강조 (배경/테두리)
- 미래 항목은 비활성 스타일로 표시 (선택은 허용하되 시각적으로 구분)
- 하단에 “시작 상태” 표시 (인덱스 없음)

### 라벨 규칙

- 라벨 우선순위: `customId` → `tag` → `elementId`
- 유형별 표기:
  - add/remove/update/move: “동작 + 대상”
  - batch/group/ungroup: “동작 (대상 수)”

### 정책 (History States limit)

- 상태 제한을 UI 또는 설정에서 명시(예: “최근 n개만 유지”)
- 제한 초과 시 가장 오래된 항목부터 제거
- Snapshot 기능 도입 시 제한 예외 처리 필요

### 접근성

- 항목은 버튼 역할로 제공, 키보드 접근 보장
- 현재 항목에 `aria-current` 또는 시각 강조 적용

### 성능

- 대량 점프 시 undo/redo 반복 호출의 비용이 큼 → 단일 복원 API 고려
- IDB 복원 완료 후 리스트 자동 포커스/스크롤로 UX 안정화

## 현재 구현 (로컬 변경 기준)

### 패널/레이아웃 등록

- 히스토리 패널을 오른쪽 패널에 등록하고 기본 레이아웃에 포함.
- 로컬 스토리지 레이아웃 마이그레이션 시 `history` 패널을 자동 삽입.

관련 파일
- `src/builder/panels/core/panelConfigs.ts`
- `src/builder/panels/core/types.ts`
- `src/builder/stores/panelLayout.ts`

### 히스토리 매니저 구독 API

- 히스토리 변경 사항을 패널과 헤더에 즉시 반영할 수 있도록 구독 메커니즘 추가.
- 현재 페이지 엔트리 조회 API 제공.

관련 파일
- `src/builder/stores/history.ts`

### BuilderCore 헤더 동기화

- 히스토리 변경을 구독해 헤더의 `current/total` 및 undo/redo 활성 상태 자동 갱신.

관련 파일
- `src/builder/main/BuilderCore.tsx`

### HistoryPanel UI

- 패널 헤더: 현재/총 상태 수, Undo/Redo/Clear 버튼.
- 리스트: 최신 항목이 상단, 하단에 “시작 상태” 표시.
- 클릭 이동: 항목 클릭 시 undo/redo 반복 호출로 해당 시점으로 이동.
- 진행 중 가드: `historyOperationInProgress` 동안 인터랙션 비활성화.

관련 파일
- `src/builder/panels/history/HistoryPanel.tsx`
- `src/builder/panels/history/HistoryPanel.css`

## UI/UX 스펙 요약

- **위치**: Right panel (Properties/Styles/Events 옆에 추가).
- **헤더**:
  - 현재/총 상태 표기: `currentIndex + 1 / totalEntries`
  - Undo/Redo/전체 삭제 버튼
- **리스트**:
  - 최신 항목이 상단
  - 현재 상태 강조 (outline/배경 강조)
  - “시작 상태” 고정 표시 (인덱스 없음)
- **상호작용**:
  - 항목 클릭 → 해당 시점으로 이동
  - Clear → 현재 페이지 히스토리 초기화 (confirm)

## 데이터 매핑 규칙

라벨 우선순위
1. `element.customId`
2. `element.tag`
3. `entry.elementId`

타입별 라벨
- `add`: “추가 + 대상”
- `remove`: “삭제 + 대상”
- `update`: “수정 + 대상”
- `move`: “이동 + 대상”
- `batch`: “일괄 수정 (n)”
- `group`: “그룹 (n)”
- `ungroup`: “그룹 해제 (n)”

## 알려진 제약/갭

- `move` 엔트리는 현재 생성 경로가 없어 라벨/표시만 준비된 상태.
- 리스트 점프는 undo/redo 반복 호출 방식이라 엔트리 수가 많을 때 느릴 수 있음.
- 썸네일/미리보기 스냅샷 없음.
- 검색/필터링/분류 없음.
- 개별 엔트리 삭제 없음(전체 초기화만 제공).
- IDB 복원은 비동기이므로 최초 로딩 시 잠시 빈 리스트가 보일 수 있음.

## 개선 항목 정리 (우선순위)

### P0 (즉시)

- 미래(redo 구간) 항목 비활성 스타일 적용
- History States limit 정책을 UI에 명시
- 항목 라벨 규칙을 사용자 액션 단위로 정규화 (연속 조작 병합)

### P1 (단기)

- 스냅샷/북마크 상태 추가
- 항목 아이콘(동작 유형) 표시
- 항목 hover 시 대상 정보 툴팁
- IDB 복원 후 자동 스크롤/포커스

### P2 (중장기)

- 대량 점프 단일 복원 API
- 버전 히스토리와 분리된 탭 제공
- 협업 사용자 태그/필터
- 히스토리 로그 내보내기

## 다음 단계

- Photoshop Web 실제 UI 레퍼런스 재확인 후 스냅샷/리스트 스타일 세부 조정
- “사용자 액션 단위” 그룹핑 규칙 정의
- 대량 히스토리 점프 성능 개선 설계
