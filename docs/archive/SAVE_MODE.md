# 💾 저장 모드 동작 설명

> **⚠️ DEPRECATED (2025-12-29)**
>
> 이 문서는 더 이상 유효하지 않습니다.
>
> **변경 사유:**
> - WebGL Canvas 전환 및 로컬 우선(Local-first) 아키텍처로 변경
> - Supabase 실시간 동기화 제거
> - 모든 변경사항은 IndexedDB에 즉시 저장됨
>
> **관련 변경:**
> - `src/builder/stores/saveMode.ts` - 삭제됨
> - `src/services/save/saveService.ts` - IndexedDB 전용으로 단순화
> - Settings Panel에서 Save Mode 섹션 제거
>
> **현재 동작:** 모든 변경사항은 IndexedDB에 즉시 저장됩니다. 실시간/수동 모드 구분이 없습니다.

---

## 🎯 설계 의도

### 1. **속성 변경** → 실시간/수동 모드 선택 가능

- **대상**: props, dataBinding 등
- **이유**: 빈번하게 발생하므로 사용자가 저장 시점 제어
- **경로**: Inspector → useSyncWithBuilder → SaveService → (모드 확인)

### 2. **구조 변경** → 항상 즉시 저장

- **대상**: 컴포넌트 추가(`addElement`), 삭제(`removeElement`)
- **이유**: 구조 변경은 중요하므로 항상 즉시 저장 필요
- **경로**: addElement/removeElement → Supabase 직접 저장

## 📊 데이터 흐름

### ✅ 속성 변경 (실시간/수동 모드 적용)

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
    ├─ ON (Auto)  → Supabase 즉시 저장
    └─ OFF (Manual) → pendingChanges에 추가
                      → Save 버튼 클릭 시 일괄 저장
```

### ✅ 구조 변경 (항상 즉시 저장)

```
컴포넌트 추가/삭제
    ↓
addElement() / removeElement()
    ↓
1. Zustand 업데이트
2. Supabase 즉시 저장 (실시간 모드 무관)
3. iframe 업데이트
```

## 🧪 테스트 시나리오

### 시나리오 1: 속성 변경 (실시간 모드)

1. Switch = Auto (녹색)
2. Inspector에서 Button의 `label` 변경
3. **콘솔**: `✅ 실시간 모드: Supabase에 즉시 저장`
4. **Supabase**: 즉시 반영 ✅

### 시나리오 2: 속성 변경 (수동 모드)

1. Switch = Manual (회색)
2. Inspector에서 Button의 `label` 변경
3. **콘솔**: `⏸️ 수동 모드: Zustand에만 저장`
4. **Supabase**: 변경 없음 (보류 중) ⏸️
5. Save 버튼 클릭
6. **Supabase**: 이제 반영됨 ✅

### 시나리오 3: 컴포넌트 추가/삭제

1. Switch = Manual (회색)
2. 새 Button 추가 또는 기존 Button 삭제
3. **Supabase**: **즉시 반영됨** ✅ (실시간 모드 무관)
4. **이유**: 구조 변경은 항상 중요하므로 즉시 저장

## 💡 핵심 정리

| 동작              | 실시간 모드   | 수동 모드     | 이유                 |
| ----------------- | ------------- | ------------- | -------------------- |
| **속성 변경**     | 즉시 저장     | Save 버튼     | 빈번하므로 선택 가능 |
| **컴포넌트 추가** | **즉시 저장** | **즉시 저장** | 구조 변경은 중요     |
| **컴포넌트 삭제** | **즉시 저장** | **즉시 저장** | 구조 변경은 중요     |

## ✅ 결론

**"컴포넌트를 추가/삭제하는 것은 실시간 모드에 상관없이 supabase에 바로 저장되어진다"**

→ **이것은 올바른 동작입니다!** ✅

구조 변경(추가/삭제)은 중요하므로 항상 즉시 저장되어야 하며,
속성 변경만 실시간/수동 모드를 따릅니다.
