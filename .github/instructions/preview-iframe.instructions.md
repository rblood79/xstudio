---
applyTo: "src/builder/preview/**"
---
# Preview (iframe 통신)
- postMessage 통신 시 origin 검증 필수.
- PREVIEW_READY 이전 메시지는 큐에 보관 후 일괄 전송.
- 메시지 타입: UPDATE_ELEMENTS / ELEMENT_SELECTED / UPDATE_ELEMENT_PROPS