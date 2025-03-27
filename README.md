# React + TypeScript + Vite + Supabase + Tailwind

# block to block Studio
#                Easy builder
#          fast X core
#                y

## Tailwind CSS v4 지침
현재 프로젝트는 Tailwind CSS v4를 사용합니다.

### 설치된 패키지 버전
- "@tailwindcss/postcss": "^4.0.17"
- "tailwindcss": "^4.0.14"
- "postcss": "^8.5.3"

### CSS 작성 규칙
✅ 올바른 사용:
```css
@import "tailwindcss";
```

❌ 사용하지 않음:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### PostCSS 설정
```javascript
// postcss.config.js
export default {
    plugins: {
        "@tailwindcss/postcss": {},    // tailwindcss가 아닌 @tailwindcss/postcss 사용
        autoprefixer: {},
    },
};
```

이 지침을 따라 일관된 스타일링 작업을 진행해주세요.
