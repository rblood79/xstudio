# 🐛 실시간 저장 모드 버그 수정 완료

> **⚠️ DEPRECATED (2025-12-29)**
>
> 이 문서는 더 이상 유효하지 않습니다.
>
> **변경 사유:**
> - WebGL Canvas 전환 및 로컬 우선(Local-first) 아키텍처로 변경
> - Supabase 실시간 동기화 제거
> - 모든 변경사항은 IndexedDB에 즉시 저장됨
>
> **현재 동작:** 모든 변경사항은 IndexedDB에 즉시 저장됩니다.
>
> **참고:** [SAVESERVICE.md](../reference/components/SAVESERVICE.md)

---

## ❌ 문제점

**증상**: Switch ON/OFF 상관없이 항상 Supabase에 저장됨

## 🔍 원인 분석

### 중복 저장 경로 발견

1. **Inspector → useSyncWithBuilder → saveService** ✅ (의도된 경로)
2. **Inspector → useSyncWithBuilder → updateElement → Supabase** ❌ (중복 저장)
3. **Inspector → updateElementProps → Supabase** ❌ (중복 저장)

### 문제 코드 위치

- `src/builder/stores/elements.ts`
  - `updateElement()` 함수: 725-740줄에서 Supabase 직접 호출
  - `updateElementProps()` 함수: 664-682줄에서 Supabase 직접 호출

## ✅ 수정 내용

### 1. `updateElement()` 수정

**변경 전**:

```typescript
// 2. 데이터베이스 업데이트
const { error } = await supabase
  .from("elements")
  .update(updateData)
  .eq("id", elementId);
```

**변경 후**:

```typescript
// 2. SaveService를 통한 저장 (실시간/수동 모드 확인)
// useSyncWithBuilder에서 이미 saveService를 호출하므로 여기서는 중복 저장 방지
// 주석 처리: saveService가 useSyncWithBuilder에서 관리
```

### 2. `updateElementProps()` 수정

**변경 전**:

```typescript
// 3. 데이터베이스 업데이트 (비동기, 실패해도 메모리는 유지)
const { error } = await supabase
  .from("elements")
  .update({ props: { ...element.props, ...props } })
  .eq("id", elementId);
```

**변경 후**:

```typescript
// 3. SaveService를 통한 저장 (실시간/수동 모드 확인)
await saveService.savePropertyChange({
  table: "elements",
  id: elementId,
  data: { props: { ...element.props, ...props } },
});
```

### 3. 디버깅 로그 추가

**SaveService.ts**:

```typescript
console.log(`💾 savePropertyChange 호출:`, {
  table: payload.table,
  id: payload.id,
  isRealtimeMode,
  mode: isRealtimeMode ? "실시간 모드" : "수동 모드",
});

if (isRealtimeMode) {
  console.log("✅ 실시간 모드: Supabase에 즉시 저장");
} else {
  console.log("⏸️ 수동 모드: Zustand에만 저장 (Supabase 저장 안 함)");
}
```

**BuilderHeader.tsx**:

```typescript
console.log(`🔄 실시간 모드 변경:`, {
  이전: isRealtimeMode ? "실시간" : "수동",
  이후: enabled ? "실시간" : "수동",
  보류중인변경: pendingChanges.size,
});
```

## 📊 데이터 흐름 (수정 후)

### ✅ 올바른 단일 경로

```
Inspector 속성 변경
    ↓
useSyncWithBuilder (debounce 100ms)
    ↓
updateElement() - Zustand 업데이트만
    ↓
saveService.savePropertyChange()
    ↓
실시간 모드 체크
    ├─ ON  → Supabase 즉시 저장
    └─ OFF → pendingChanges에 추가
```

## 🧪 테스트 방법

### 1. 실시간 모드 (Auto) 테스트

1. Switch = Auto (녹색 indicator)
2. Inspector에서 Button의 `label` 변경
3. **콘솔 확인**:
   ```
   💾 savePropertyChange 호출: { mode: '실시간 모드' }
   ✅ 실시간 모드: Supabase에 즉시 저장
   💾 Supabase 저장: elements:xxx
   ```
4. **Supabase 테이블 확인**: 즉시 반영됨 ✅

### 2. 수동 모드 (Manual) 테스트

1. Switch = Manual (회색 indicator)
2. Inspector에서 Button의 `label` 변경
3. **콘솔 확인**:
   ```
   💾 savePropertyChange 호출: { mode: '수동 모드' }
   ⏸️ 수동 모드: Zustand에만 저장 (Supabase 저장 안 함)
   ```
4. **Supabase 테이블 확인**: 변경 없음 ✅
5. **Save 버튼**: `Save (1)` 표시
6. Save 클릭 → 콘솔:
   ```
   💾 1개 변경사항 저장 시작...
   ✅ 1개 변경사항 저장 완료
   ```
7. **Supabase 테이블 확인**: 이제 반영됨 ✅

### 3. 모드 전환 테스트

1. Manual 모드에서 여러 속성 변경 (보류)
2. Switch → Auto 전환
3. **콘솔 확인**:
   ```
   🔄 실시간 모드 변경: { 이전: '수동', 이후: '실시간', 보류중인변경: 3 }
   📤 수동 → 실시간 전환: 보류 중인 변경사항 자동 저장
   💾 3개 변경사항 저장 시작...
   ✅ 3개 변경사항 저장 완료
   ```
4. **Supabase 테이블 확인**: 모든 변경사항 반영됨 ✅

## 📁 수정된 파일

1. ✅ `src/builder/stores/elements.ts`

   - `updateElement()`: Supabase 직접 저장 제거
   - `updateElementProps()`: SaveService 사용으로 변경
   - `saveService` import 추가

2. ✅ `src/builder/services/saveService.ts`

   - 디버깅 로그 추가 (모드 확인)

3. ✅ `src/builder/main/BuilderHeader.tsx`
   - 모드 전환 시 로그 추가

## ✅ 검증 완료

- ✅ TypeScript 에러 없음
- ✅ 실시간 모드: Supabase 즉시 저장 확인
- ✅ 수동 모드: Zustand만 저장, Supabase 저장 안 함 확인
- ✅ Save 버튼: 일괄 저장 동작 확인
- ✅ 모드 전환: 자동 저장 동작 확인
- ✅ 콘솔 로그: 모든 상태 추적 가능

## 🎯 결론

**중복 저장 경로를 제거하고 SaveService를 통한 단일 경로로 통일**
→ 실시간/수동 모드가 정상 작동합니다! 🚀
