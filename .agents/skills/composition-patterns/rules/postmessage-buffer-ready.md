---
title: Buffer Messages Until PREVIEW_READY
impact: HIGH
impactDescription: 메시지 유실 방지, 안정적 통신, 초기화 동기화
tags: [postmessage, iframe, communication]
---

iframe이 PREVIEW_READY를 보낼 때까지 메시지를 버퍼링합니다.

## Incorrect

```tsx
// ❌ 즉시 메시지 전송 (유실 가능)
function sendToPreview(message: Message) {
  previewFrame.current?.contentWindow?.postMessage(message, origin);
}

// iframe이 아직 로드되지 않았을 수 있음
sendToPreview({ type: 'INIT', payload: initialState });
```

## Correct

```tsx
// ✅ PREVIEW_READY까지 버퍼링
class PreviewBridge {
  private messageBuffer: Message[] = [];
  private isReady = false;
  private frameRef: RefObject<HTMLIFrameElement>;

  constructor(frameRef: RefObject<HTMLIFrameElement>) {
    this.frameRef = frameRef;
    window.addEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'PREVIEW_READY') {
      this.isReady = true;
      this.flushBuffer();
    }
  };

  private flushBuffer() {
    this.messageBuffer.forEach(msg => this.sendDirect(msg));
    this.messageBuffer = [];
  }

  private sendDirect(message: Message) {
    this.frameRef.current?.contentWindow?.postMessage(
      message,
      import.meta.env.VITE_PREVIEW_ORIGIN
    );
  }

  send(message: Message) {
    if (this.isReady) {
      this.sendDirect(message);
    } else {
      this.messageBuffer.push(message);
    }
  }

  destroy() {
    window.removeEventListener('message', this.handleMessage);
  }
}
```
