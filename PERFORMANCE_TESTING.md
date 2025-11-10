# 성능 측정 가이드

## React DevTools Profiler 사용법

### 1. 개발 서버 실행
```bash
npm run dev
```

### 2. Chrome에서 React DevTools 설치
- Chrome 웹 스토어에서 "React Developer Tools" 설치

### 3. Profiler 탭에서 측정
1. DevTools → Profiler 탭 열기
2. 녹화 버튼 클릭
3. 주요 액션 수행:
   - Dashboard 로딩
   - Project 생성/삭제
   - Builder 페이지 로딩
   - Element 추가/삭제
   - Inspector 탭 전환
4. 녹화 중지

### 4. 측정 항목
- **Commit Duration**: 각 렌더링 소요 시간
- **Render Count**: 컴포넌트별 렌더링 횟수
- **Props/State Changes**: 리렌더링 원인

## Chrome Memory Profiler 사용법

### 1. 메모리 스냅샷 비교
1. DevTools → Memory 탭
2. Heap snapshot 선택
3. 액션 전 스냅샷 촬영
4. 주요 액션 수행 (Element 100개 추가 등)
5. 액션 후 스냅샷 촬영
6. Comparison 뷰로 메모리 증가량 확인

### 2. 측정 항목
- **Heap Size**: 총 메모리 사용량
- **Shallow Size**: 객체 자체 크기
- **Retained Size**: 객체 + 참조 크기
- **Detached DOM**: 메모리 누수 여부

## Performance API 사용 (코드 측정)

```typescript
// src/utils/performanceMonitor.ts
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
};

// 사용 예시
measurePerformance('Dashboard Load', () => {
  // 데이터 로딩 코드
});
```

## 번들 사이즈 측정

### 1. 빌드 후 분석
```bash
npm run build
ls -lh dist/assets/*.js
```

### 2. Bundle Analyzer 설치 (선택)
```bash
npm install --save-dev rollup-plugin-visualizer
```

vite.config.ts 수정:
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true })
  ]
});
```

## 예상 결과

### Before (추정)
- Dashboard 로딩: ~500ms
- Element 추가: ~100ms
- Inspector 탭 전환: ~50ms
- 메모리 사용: ~150MB

### After (목표)
- Dashboard 로딩: ~400ms (20% 개선)
- Element 추가: ~80ms (20% 개선)
- Inspector 탭 전환: ~40ms (20% 개선)
- 메모리 사용: ~120MB (20% 개선)

## 실제 측정 필요 항목

1. ✅ **코드 메트릭** (완료)
   - useState: -39개
   - 코드 라인: -1,569

2. ⏳ **렌더링 성능** (미측정)
   - React Profiler로 측정 필요
   
3. ⏳ **메모리 사용량** (미측정)
   - Chrome Memory Profiler로 측정 필요
   
4. ⏳ **번들 사이즈** (미측정)
   - 빌드 성공 후 측정 필요
