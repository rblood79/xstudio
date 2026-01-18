# ADR-004: iframe for Preview Isolation

**Status:** Accepted
**Date:** 2024-01-01
**Decision Makers:** XStudio Team

## Context

XStudio는 실시간 프리뷰가 필요합니다:
- 사용자 컴포넌트 렌더링
- Builder 스타일과 완전 격리
- 테마 커스터마이징 지원
- 보안 격리 (사용자 코드 실행)

## Decision

**iframe + postMessage**를 사용하여 Preview를 격리합니다.

## Alternatives Considered

| 옵션 | 장점 | 단점 |
|------|------|------|
| Shadow DOM | 같은 문서 내 | 스타일 격리 불완전 |
| iframe | 완전 격리, 보안 | 통신 복잡성 |
| Web Components | 표준 기반 | 스타일 격리 한계 |
| Separate Tab | 완전 독립 | UX 불편 |

## Rationale

1. **완전 격리**: CSS/JS 충돌 불가
2. **보안**: sandbox 속성으로 제어
3. **테마 독립**: Preview만 테마 변경 가능
4. **표준 기반**: 브라우저 네이티브 지원

## Communication Protocol

### Builder → Preview
```typescript
// 요소 업데이트
{ type: 'UPDATE_ELEMENTS', elements: Element[] }

// Delta 업데이트 (최적화)
{ type: 'DELTA_ELEMENT_ADDED', element, childElements }
{ type: 'DELTA_ELEMENT_UPDATED', elementId, propsChanges }
{ type: 'DELTA_ELEMENT_REMOVED', elementId, childIds }

// 테마 변수
{ type: 'THEME_VARS', vars: ThemeVar[] }
```

### Preview → Builder
```typescript
// 요소 선택
{ type: 'SELECT_ELEMENT', elementId }

// Computed Styles
{ type: 'COMPUTED_STYLES', elementId, styles }

// Ready 신호
{ type: 'PREVIEW_READY' }
```

## Security Constraints

```typescript
// Origin 검증 필수
window.addEventListener('message', (event) => {
  if (!isAllowedOrigin(event.origin)) return;
  // ...
});

// 메시지 버퍼링 (PREVIEW_READY 전)
if (!isReady) {
  messageQueue.push(message);
  return;
}
```

## Consequences

### Positive
- Builder/Preview 완전 격리
- 사용자 코드 보안 샌드박스
- 독립적인 테마 시스템

### Negative
- postMessage 통신 복잡성
- 동기화 지연 가능성
- 디버깅 어려움

## Implementation

```typescript
// IframeMessenger
class IframeMessenger {
  private messageQueue: Message[] = [];
  private isReady = false;

  send(message: Message) {
    if (!this.isReady) {
      this.messageQueue.push(message);
      return;
    }
    this.iframe.contentWindow?.postMessage(message, this.targetOrigin);
  }

  onReady() {
    this.isReady = true;
    this.messageQueue.forEach(msg => this.send(msg));
    this.messageQueue = [];
  }
}
```

## References

- `apps/builder/src/utils/dom/iframeMessenger.ts` - Messenger 구현
- `apps/builder/src/preview/` - Preview 앱
- `.claude/skills/xstudio-patterns/rules/postmessage-*.md` - 관련 규칙
