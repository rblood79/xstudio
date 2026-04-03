# 상태 관리 상세 레퍼런스

state-management.md의 핵심 규칙에 대한 구현 상세.

## batchUpdateElementProps DB 저장 패턴

DB 저장 시 delta props가 아닌 **merged 전체 props**를 저장해야 한다.

```typescript
// 잘못된 패턴 — delta만 저장 → 새로고침 후 나머지 props 소실
await db.updateElement({ id, props: delta });

// 올바른 패턴 — merged 전체 저장
const merged = { ...existing.props, ...delta };
await db.updateElement({ id, props: merged });
```

`existing`은 store의 `elementsMap.get(id)`에서 읽는다. delta만 저장하면 새로고침 후 delta에 포함되지 않은 나머지 props가 DB에서 사라진다.

## pageElementsSnapshot 갱신

요소 삭제(`executeRemoval`) 후 `pageElementsSnapshot`을 반드시 갱신해야 한다.

- 위치: `elementRemoval.ts`의 `executeRemoval` — 삭제 완료 후 snapshot 업데이트
- 갱신 누락 시: 삭제된 요소가 레이어 트리(Layer Panel)에 유령 항목으로 남음

```typescript
// executeRemoval 완료 직후
set((state) => ({
  pageElementsSnapshot: buildPageElementsSnapshot(
    state.elementsMap,
    state.childrenMap,
  ),
}));
```

## PropertyUnitInput 요소 전환 보호

이벤트 순서: `mousedown`(선택 변경) → `blur`(입력 커밋). blur 시점에 이미 새 요소가 선택되어 있으므로, blur 핸들러에서 그냥 onChange를 호출하면 새 요소에 잘못된 값이 적용된다.

```typescript
// handleInputFocus — focus 시점의 selectedElementId를 ref에 캡처
const focusedElementIdRef = useRef<string | null>(null);
const handleInputFocus = () => {
  focusedElementIdRef.current = selectedElementId;
};

// handleInputBlur — blur 시점과 비교, 다르면 스킵
const handleInputBlur = (value: string) => {
  if (focusedElementIdRef.current !== selectedElementId) return;
  onChange(value);
};
```

## buildSelectedElement에 properties 전달

`useZustandJotaiBridge.ts`의 `StylePanelSelectedElement`에 `properties` 필드를 반드시 포함해야 한다.

```typescript
// effectiveProps에서 size/variant를 추출하여 properties로 전달
const properties = {
  size: effectiveProps.size,
  variant: effectiveProps.variant,
};
buildSelectedElement({ element, properties });
```

미전달 시: `computeSyntheticStyle`이 size를 모름 → 항상 `"md"` fallback → 잘못된 fontSize 표시.

## SyntheticComputedStyle 확장 규칙

Spec preset에 새 속성을 추가할 때:

1. `SyntheticComputedStyle` 인터페이스에 해당 속성 추가
2. `typographyValuesAtom` + 개별 atom에 synthetic fallback 체인 추가

```typescript
// 우선순위 체인 예시
const fontSizeAtom = atom((get) => {
  const inline = get(inlineStyleAtom).fontSize; // 1순위: inline
  const computed = get(computedStyleAtom).fontSize; // 2순위: computed(상속)
  const synthetic = get(syntheticStyleAtom).fontSize; // 3순위: synthetic(preset)
  return inline ?? computed ?? synthetic ?? DEFAULT_FONT_SIZE; // 4순위: 글로벌 기본값
});
```
