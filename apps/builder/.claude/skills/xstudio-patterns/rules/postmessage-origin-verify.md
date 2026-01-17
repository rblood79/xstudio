---
title: Always Verify PostMessage Origin
impact: CRITICAL
impactDescription: XSS 방지, 보안, iframe 통신 안전성
tags: [security, postmessage, iframe]
---

postMessage 수신 시 반드시 origin을 검증합니다.

## Incorrect

```tsx
// ❌ origin 검증 없음
window.addEventListener('message', (event) => {
  // 악의적인 출처에서도 메시지 처리됨
  const { type, payload } = event.data;
  handleMessage(type, payload);
});

// ❌ 불완전한 검증
window.addEventListener('message', (event) => {
  if (event.origin.includes('mysite.com')) {  // 우회 가능
    handleMessage(event.data);
  }
});
```

## Correct

```tsx
// ✅ 엄격한 origin 검증
const ALLOWED_ORIGINS = [
  'https://app.xstudio.com',
  'https://preview.xstudio.com',
  import.meta.env.VITE_PREVIEW_ORIGIN
].filter(Boolean);

window.addEventListener('message', (event) => {
  // 정확한 origin 일치 검사
  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    console.warn('Rejected message from untrusted origin:', event.origin);
    return;
  }

  // 메시지 타입 검증
  if (!event.data?.type || typeof event.data.type !== 'string') {
    return;
  }

  handleMessage(event.data);
});

// ✅ 전송 시에도 targetOrigin 명시
previewFrame.contentWindow?.postMessage(
  { type: 'UPDATE_PROPS', payload },
  import.meta.env.VITE_PREVIEW_ORIGIN  // '*' 사용 금지
);
```
