# 실시간 저장 모드 기능 구현 완료 ✅

## 📋 구현 내용

### 1️⃣ **Zustand Store에 SaveMode 상태 추가**

- **파일**: `src/builder/stores/saveMode.ts` (신규 생성)
- **기능**:
  - `isRealtimeMode`: 실시간 저장 모드 활성화 여부 (기본값: `true`)
  - `pendingChanges`: 보류 중인 변경사항 Map (key: 'table:id', value: 변경 데이터)
  - `setRealtimeMode()`: 실시간 모드 토글
  - `addPendingChange()`: 변경사항 추가 (기존 데이터와 병합)
  - `clearPendingChanges()`: 모든 변경사항 제거
  - `getPendingChanges()`: 변경사항 조회

### 2️⃣ **SaveService 싱글톤 클래스 생성**

> **📦 리팩토링**: `src/builder/services/` → `src/services/save/`로 이동됨 (2025-10-09)  
> 자세한 내용은 [SaveService 리팩토링](./SAVESERVICE_REFACTORING.md) 참고

- **파일**: `src/services/save/saveService.ts` (신규 생성)
- **기능**:
  - `savePropertyChange()`: 속성 변경 저장 (실시간 모드 확인)
    - 실시간 모드 ON: 즉시 Supabase 저장
    - 실시간 모드 OFF: Zustand에만 저장 (Map에 추가)
  - `saveAllPendingChanges()`: 보류 중인 모든 변경사항 일괄 저장
    - Promise.all()로 병렬 처리
    - 저장 완료 후 pendingChanges 초기화
  - `saveToSupabase()`: Supabase 실제 저장 (private 메서드)

### 3️⃣ **BuilderHeader UI 추가**

- **파일**: `src/builder/main/BuilderHeader.tsx` 수정
- **추가 컴포넌트**:
  - **Switch (realtime-mode)**:
    - ON (Auto): 녹색 indicator, 실시간 저장
    - OFF (Manual): 회색 indicator, Zustand에만 저장
    - 수동 → 자동 전환 시: 보류 중인 변경사항 자동 저장
  - **Save 버튼**:
    - 실시간 모드 ON: 비활성화 (저장할 것 없음)
    - 실시간 모드 OFF: 활성화, `Save (3)` 처럼 변경 개수 표시
    - 저장 중: "Saving..." 표시, 버튼 비활성화

### 4️⃣ **Inspector 동기화에 SaveService 통합**

- **파일**: `src/builder/inspector/hooks/useSyncWithBuilder.ts` 수정
- **로직**:
  - Inspector에서 속성 변경 시 → `updateElement()` (Zustand 업데이트)
  - 동시에 `saveService.savePropertyChange()` 호출
  - SaveService가 실시간 모드 확인 후 Supabase 저장 or 보류

### 5️⃣ **CSS 스타일 추가**

- **파일**: `src/builder/main/index.css` 수정
- **스타일**:
  - Switch indicator: 녹색(Auto) / 회색(Manual)
  - Save 버튼: 파란색, hover 효과, disabled 상태
  - 변경사항 있을 때 주황색 + pulse 애니메이션 (optional)

---

## 🚀 사용 흐름

### 시나리오 1: 실시간 저장 (기본)

1. Switch = Auto (녹색)
2. Inspector에서 속성 변경
3. → Zustand 업데이트
4. → **즉시 Supabase 저장** ✅
5. Save 버튼: 비활성화 (저장할 것 없음)

### 시나리오 2: 수동 저장

1. Switch를 Manual로 변경 (회색)
2. Inspector에서 속성 변경
3. → Zustand 업데이트
4. → **Supabase 저장 안 함** (pendingChanges에 추가)
5. Save 버튼: `Save (3)` 활성화
6. Save 버튼 클릭 → **일괄 저장** ✅
7. pendingChanges 초기화, 버튼 비활성화

### 시나리오 3: 수동 → 실시간 전환

1. Manual 모드에서 여러 속성 변경 (보류 중)
2. Switch를 Auto로 변경
3. → **자동으로 보류 중인 변경사항 모두 저장** ✅
4. 이후 변경사항은 즉시 저장

---

## 📁 수정/생성된 파일 목록

### 신규 생성 (4개)

1. `src/builder/stores/saveMode.ts` - SaveMode Zustand Slice
2. `src/services/save/saveService.ts` - SaveService 싱글톤 클래스 (**리팩토링**: `src/builder/services/` → `src/services/save/`로 이동)
3. `src/services/save/index.ts` - SaveService export 관리
4. `src/services/index.ts` - 전체 서비스 레이어 통합 export

### 수정 (4개)

1. `src/builder/stores/index.ts` - SaveMode Slice 통합
2. `src/builder/main/BuilderHeader.tsx` - Switch/Save 버튼 UI 추가 (import: `"../../services/save"`)
3. `src/builder/main/index.css` - Switch/Save 버튼 스타일 추가
4. `src/builder/inspector/hooks/useSyncWithBuilder.ts` - SaveService 통합

### 리팩토링 (2025-10-09)

- `src/builder/services/` → `src/services/save/`로 이동
- 모든 import 경로 업데이트 완료
- 자세한 내용: [SaveService 리팩토링](./SAVESERVICE_REFACTORING.md)

---

## 🔍 타입 안전성

- ✅ 모든 함수에 명시적 반환 타입 (`void`, `Promise<void>`)
- ✅ `SupabaseTable` 타입 제한 (`'elements' | 'pages' | 'projects'`)
- ✅ `SavePayload` 인터페이스로 타입 안전성 보장
- ✅ `Map<string, Record<string, unknown>>` 정확한 타입 정의
- ✅ `any` 타입 사용 없음

---

## 🧪 테스트 체크리스트

- [ ] 실시간 모드에서 속성 변경 시 즉시 Supabase 저장 확인
- [ ] 수동 모드에서 속성 변경 시 Supabase 저장 안 됨 확인
- [ ] Save 버튼 클릭 시 보류 중인 변경사항 일괄 저장 확인
- [ ] 변경 개수 표시 (`Save (3)`) 정확성 확인
- [ ] Manual → Auto 전환 시 자동 저장 확인
- [ ] 저장 중 버튼 비활성화 및 "Saving..." 표시 확인
- [ ] Switch indicator 색상 변경 확인 (녹색/회색)

---

## 🎯 성능 최적화

1. **Debounce (100ms)**: 연속된 속성 변경 시 100ms 대기 후 저장
2. **병렬 저장**: `Promise.all()`로 여러 변경사항 동시 저장
3. **Map 자료구조**: O(1) 시간 복잡도로 변경사항 추가/조회
4. **데이터 병합**: 동일 요소의 여러 속성 변경을 하나로 병합

---

## 🛠️ 추가 개선 가능 사항 (Optional)

1. **토스트 알림**: 저장 성공/실패 사용자 피드백
2. **로컬 스토리지**: 브라우저 종료 시 보류 중인 변경사항 백업
3. **Undo/Redo 통합**: 수동 모드에서 Undo 시 pendingChanges 동기화
4. **저장 진행률**: 여러 변경사항 저장 시 진행률 표시
5. **자동 저장 타이머**: 5분마다 자동으로 보류 중인 변경사항 저장
6. **네트워크 오프라인 감지**: 오프라인 시 자동으로 Manual 모드 전환

---

## ✅ 완료!

실시간 저장과 수동 저장 기능이 모두 구현되었습니다.
사용자는 Switch로 저장 방식을 자유롭게 선택할 수 있으며,
수동 모드에서는 Save 버튼으로 일괄 저장할 수 있습니다.

**모든 TypeScript 에러 없음, 타입 안전성 보장됨** 🎉
