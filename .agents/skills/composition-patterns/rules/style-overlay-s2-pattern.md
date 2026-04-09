---
title: Overlay CSS S2 Pattern (Popover/Tooltip)
impact: HIGH
impactDescription: contain: paint + 상시 transform이 Popover 내부 Dialog를 불가시하게 만드는 버그 유발 (ADR-047)
tags: [style, css, overlay, popover, tooltip, s2]
---

Popover/Tooltip 등 overlay 컴포넌트 CSS에서 S2 패턴을 준수한다.

## 금지 패턴 (Overlay 계열)

```css
/* ❌ contain: paint — Popover 경계 밖 콘텐츠 클리핑 */
.react-aria-Popover[data-trigger="..."] {
  contain: layout style paint;
}

/* ❌ 상시 transform — 불필요한 containing block + GPU layer */
.react-aria-Popover {
  transform: translate3d(0, 0, 0);
  will-change: transform, opacity;
  backface-visibility: hidden;
}

/* ❌ Popover 내부 자식에 상시 GPU layer 강제 */
.react-aria-ListBox {
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
}
```

## 올바른 패턴 (S2 기준)

```css
/* ✅ display: flex + isolation: isolate (S2 패턴) */
.react-aria-Popover {
  display: flex;
  isolation: isolate;
  transition:
    transform 150ms,
    opacity 150ms;
}

/* ✅ will-change는 애니메이션 시에만 */
.react-aria-Popover[data-entering],
.react-aria-Popover[data-exiting] {
  will-change: transform, opacity;
}

/* ✅ contain 사용 시 paint 제외 */
.react-aria-Popover[data-trigger="Select"] {
  contain: layout style; /* paint 없음 */
}

/* ✅ Popover 내부 Dialog는 static (generated CSS override) */
.react-aria-Popover .react-aria-Dialog {
  position: static;
}
```

## 액션 메뉴 패턴 (ComboBox vs MenuTrigger)

입력 필드 + 드롭다운 액션 메뉴 조합에서는 **MenuTrigger + Menu**를 사용한다. ComboBox는 "값 선택"용이며 액션 실행에 부적합.

```tsx
/* ❌ ComboBox — 액션 메뉴에 부적합 */
/* selectedKey={null} 고정 → 팝오버 자동 닫힘 미작동 */
/* menuTrigger="input" 기본값 → inputValue 변경 시 팝오버 재오픈 */
<ComboBox selectedKey={null} allowsCustomValue onSelectionChange={...}>
  <Input /><Button /><Popover><ListBox>...</ListBox></Popover>
</ComboBox>

/* ✅ MenuTrigger + Menu — 아이템 선택 시 자동 닫힘 (React Aria 내장) */
<input value={inputValue} onChange={...} />
<MenuTrigger>
  <Button>▼</Button>
  <Popover triggerRef={anchorRef} placement="bottom start">
    <Menu onAction={handleAction}>
      <MenuItem id="action-1">...</MenuItem>
    </Menu>
  </Popover>
</MenuTrigger>
```

- **`triggerRef`**: Popover를 트리거 버튼이 아닌 다른 요소(컨테이너) 기준으로 배치 (React Aria 공식 API)
- 참조: `ZoomControls.tsx`, React Aria Popover.md "Custom anchor" 섹션

## 근거

- `contain: paint`는 요소 경계 밖 콘텐츠 렌더링을 차단 — Dialog가 `position: fixed`(generated CSS)로 flow에서 빠지면 Popover가 2x2px로 축소되고 캘린더 불가시
- 상시 `transform: translate3d(0,0,0)` + `will-change`는 영구 GPU compositing layer 할당 → VRAM 낭비 (MDN 남용 경고)
- `transform`이 있으면 `position: fixed` 자식의 containing block이 viewport 대신 해당 요소 → 의도치 않은 포지셔닝
- S2 Popover 소스에서는 `contain`, 상시 `transform`, `will-change`, `backface-visibility` 모두 사용하지 않음
- 참조: ADR-047, `packages/shared/src/components/styles/Popover.css`
