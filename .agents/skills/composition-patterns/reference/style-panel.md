# Style Panel — Zustand-Jotai Bridge 패턴

## 아키텍처 개요

```
Zustand Store (source of truth)
  → useZustandJotaiBridge (useLayoutEffect + subscribe)
    → buildSelectedElement() → StylePanelSelectedElement
      → selectedElementAtom (Jotai)
        → selectAtom (fontSizeAtom, fontWeightAtom, typographyValuesAtom, ...)
          → TypographySection / TransformSection / ... (UI)
```

## 핵심 파일

| 파일                                              | 역할                                        |
| ------------------------------------------------- | ------------------------------------------- |
| `panels/styles/hooks/useZustandJotaiBridge.ts`    | Zustand → Jotai 단방향 동기화               |
| `panels/styles/atoms/styleAtoms.ts`               | selectAtom 기반 세분화 구독                 |
| `services/computedStyleService.ts`                | tag+size → SyntheticComputedStyle 계산      |
| `components/property/PropertyUnitInput.tsx`       | 숫자+단위 입력 컴포넌트                     |
| `panels/styles/hooks/useOptimizedStyleActions.ts` | 스타일 업데이트 최적화 (RAF/Idle/Immediate) |

## PropertyUnitInput 요소 전환 보호 (CRITICAL)

### 문제

캔버스에서 다른 요소를 클릭하면 mousedown → selectedElementId 변경 → Input blur 순서로 이벤트 발생.
blur 핸들러가 `useStore.getState().selectedElementId`를 읽을 때 이미 새 요소로 변경되어 있어,
이전 요소에 입력한 값이 새 요소에 적용됨.

### 해결 패턴

```typescript
// focus 시점의 elementId 캡처
const focusedElementIdRef = useRef<string | null>(null);

const handleInputFocus = (e) => {
  e.target.select();
  focusedElementIdRef.current = useStore.getState().selectedElementId ?? null;
};

const handleInputBlur = (e) => {
  // 요소 전환 감지 → onChange 스킵
  const currentElementId = useStore.getState().selectedElementId ?? null;
  if (
    focusedElementIdRef.current !== null &&
    currentElementId !== focusedElementIdRef.current
  ) {
    return;
  }
  // ... 정상 blur 처리
};
```

## buildSelectedElement — properties 전달 (CRITICAL)

### 문제

`StylePanelSelectedElement`에 `properties` (size, variant)가 없으면
`computeSyntheticStyle`이 항상 `size='md'`로 fallback하여 잘못된 preset 값 표시.

### 규칙

- `StylePanelSelectedElement` 인터페이스에 `properties` 필드 포함
- `buildSelectedElement()`에서 `effectiveProps`의 `size`/`variant`를 추출하여 전달
- `computeSyntheticStyle`은 `element.properties?.size`를 기반으로 올바른 preset 조회

```typescript
// useZustandJotaiBridge.ts — buildSelectedElement()
const size = effectiveProps?.size as string | undefined;
const variant = effectiveProps?.variant as string | undefined;
return {
  ...baseElement,
  properties:
    size !== undefined || variant !== undefined ? { size, variant } : undefined,
};
```

## SyntheticComputedStyle 확장 규칙

### 스타일 값 우선순위 (4단계)

```
1. inline style    — 사용자가 직접 설정한 인라인 스타일
2. computed style  — 부모 체인 CSS 상속 (resolveInheritedStyle)
3. synthetic style — tag + size/variant 기반 preset (computeSyntheticStyle)
4. global default  — 글로벌 기본값 ('16px', 'normal', '#000000' 등)
```

### 새 속성 추가 시 체크리스트

1. `SyntheticComputedStyle` 인터페이스에 optional 필드 추가 (`computedStyleService.ts`)
2. `computeFromTag()` 또는 `fromXxxPreset()` 함수에서 해당 속성 반환
3. `typographyValuesAtom` (그룹 atom)에 synthetic fallback 체인 추가
4. 개별 atom (예: `fontWeightAtom`)에도 synthetic fallback 추가

### 현재 SyntheticComputedStyle 지원 속성

| 속성                         | 지원 태그                                   | 기본값 출처        |
| ---------------------------- | ------------------------------------------- | ------------------ |
| fontSize                     | Button, Input계열, Checkbox, Badge, Link 등 | getSizePreset 계열 |
| fontWeight                   | Button(500), Input(400), Badge(500)         | Spec shapes 기본값 |
| paddingTop/Right/Bottom/Left | Button, Input계열, Badge, Card              | getSizePreset 계열 |
| borderRadius                 | Button, Input계열, Card, ProgressBar, Meter | getSizePreset 계열 |
| lineHeight                   | (미구현)                                    | —                  |

## updateSelectedStyle — 호출 시점 주의

`updateStyleImmediate`는 `useStore.getState().updateSelectedStyle()`을 호출.
이 함수는 **호출 시점의** `selectedElementId`를 기반으로 동작.
따라서 blur 시점에 selection이 변경되면 잘못된 요소에 적용됨 → PropertyUnitInput 보호 패턴 필수.
