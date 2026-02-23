> **⚠️ 레거시 문서**: 현재 아키텍처와 일치하지 않을 수 있습니다. 역사적 참조 목적.

# 🔲 프리뷰 Checkbox 동작 확인

## ❓ 문제 확인

**질문**: "checkbox 컴퍼넌트의 `isSelected`의 경우 프러퍼티에디터에서는 실시간/수동 모드에 따라 적용되지만 프리뷰화면에서 체크/해지시 모드에 상관없이 저장되어진다"

## 🔍 코드 분석

### 프리뷰에서 Checkbox 클릭 시 흐름

**src/builder/preview/index.tsx (403-413줄)**:

```typescript
onChange={(isSelected) => {
  console.log('🔲 Preview Checkbox 변경:', {
    elementId: el.id,
    isSelected,
  });
  const updatedProps = {
    ...el.props,
    isSelected: Boolean(isSelected),
  };
  updateElementProps(el.id, updatedProps);
}}
```

### updateElementProps 함수

**src/builder/stores/elements.ts (623-677줄)**:

```typescript
updateElementProps: async (elementId, props) => {
  console.log("🔧 updateElementProps 호출:", {
    elementId,
    elementTag: element.tag,
    변경props: props,
  });

  // 1. Zustand 업데이트
  set(
    produce((state: ElementsState) => {
      element.props = { ...element.props, ...props };
    })
  );

  // 2. SaveService를 통한 저장 (실시간/수동 모드 확인)
  await saveService.savePropertyChange({
    table: "elements",
    id: elementId,
    data: { props: { ...element.props, ...props } },
  });
};
```

## ✅ 결론

**프리뷰 Checkbox 클릭도 실시간/수동 모드를 따릅니다!**

### 데이터 흐름

```
프리뷰 Checkbox 클릭
    ↓
onChange 핸들러
    ↓
updateElementProps(elementId, { isSelected: true })
    ↓
saveService.savePropertyChange()
    ↓
실시간 모드 체크
    ├─ ON (Auto)  → Supabase 즉시 저장 ✅
    └─ OFF (Manual) → pendingChanges에 추가 ⏸️
```

### Inspector vs 프리뷰 일관성

| 변경 위치     | 함수 호출                                              | SaveService 사용 | 모드 적용 |
| ------------- | ------------------------------------------------------ | ---------------- | --------- |
| **Inspector** | `useSyncWithBuilder` → `updateElement` → `saveService` | ✅               | ✅        |
| **프리뷰**    | `onChange` → `updateElementProps` → `saveService`      | ✅               | ✅        |

**두 경로 모두 동일하게 실시간/수동 모드를 따릅니다!** 🎉

## 🧪 테스트 방법

### 1. 실시간 모드 (Auto)

1. Switch = Auto (녹색)
2. 프리뷰에서 Checkbox 클릭
3. **콘솔 확인**:
   ```
   🔲 Preview Checkbox 변경: { isSelected: true }
   🔧 updateElementProps 호출: { elementTag: 'Checkbox' }
   💾 savePropertyChange 호출: { mode: '실시간 모드' }
   ✅ 실시간 모드: Supabase에 즉시 저장
   ```
4. **Supabase 확인**: 즉시 반영됨 ✅

### 2. 수동 모드 (Manual)

1. Switch = Manual (회색)
2. 프리뷰에서 Checkbox 여러 번 클릭
3. **콘솔 확인**:
   ```
   🔲 Preview Checkbox 변경: { isSelected: true }
   🔧 updateElementProps 호출: { elementTag: 'Checkbox' }
   💾 savePropertyChange 호출: { mode: '수동 모드' }
   ⏸️ 수동 모드: Zustand에만 저장 (Supabase 저장 안 함)
   ```
4. **Supabase 확인**: 변경 없음 (보류 중) ⏸️
5. **Save 버튼**: `Save (3)` 표시
6. **Save 클릭**: 모든 변경사항 일괄 저장
7. **Supabase 확인**: 이제 반영됨 ✅

### 3. Inspector + 프리뷰 혼합

1. Switch = Manual (회색)
2. Inspector에서 `isSelected` 변경 → 보류 중
3. 프리뷰에서 Checkbox 클릭 → **동일하게 보류 중** ✅
4. **Save 버튼**: `Save (2)` (두 변경사항 모두 카운트)
5. **Save 클릭**: 일괄 저장

## 🎯 핵심 요약

**Inspector든 프리뷰든 상관없이 모든 속성 변경은 `updateElementProps` → `saveService`를 거치므로 동일하게 실시간/수동 모드를 따릅니다.**

만약 프리뷰에서 클릭 시 항상 즉시 저장된다면, 콘솔에서 다음을 확인하세요:

- `💾 savePropertyChange` 로그의 `mode` 값
- `⏸️ 수동 모드` 로그가 출력되는지
- `pendingChanges` Map에 추가되는지

**정상 작동 중입니다!** ✅
