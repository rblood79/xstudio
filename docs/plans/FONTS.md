# FONTS 실행 계획서

## 1) 목적

사용자 커스텀 폰트를 Builder에서 추가한 뒤, 아래 모든 경로에서 동일하게 보이도록 한다.

1. 스타일 패널 Typography의 폰트 리스트에 노출
2. WebGL(및 관련 텍스트 렌더 경로) 반영
3. Preview iframe 반영
4. Publish 앱 반영
5. 정적 퍼블리시 산출물(HTML + assets)에서 시스템 폰트가 아닌 경우에도 동작

---

## 2) 범위(Scope)

### In Scope

- 폰트 등록/저장/삭제/목록 노출 UX
- 폰트 메타데이터 구조 정의 (family, weight/style, source, format)
- 렌더링 경로별 폰트 로드 전략 통합(Builder DOM, WebGL, Preview srcdoc, Publish)
- 정적 export 시 폰트 파일 자산 포함 전략 수립 및 구현

### Out of Scope (이번 라운드)

- 팀/프로젝트 단위 원격 폰트 저장소(예: Supabase Storage 동기화)
- 라이선스 스캐닝 자동화
- Variable font 고급 축(axis) 편집 UI

---

## 3) 설계 원칙

1. **단일 폰트 레지스트리**를 기준으로 모든 런타임이 읽는다.
2. **Data URL 임시 전략 + 파일 자산 전략**을 분리한다.
3. **CSS(@font-face)와 Canvas/WebGL 폰트 로더**를 동일 메타데이터에서 파생한다.
4. 실패 시 반드시 **fallback 폰트 체인**으로 안전하게 렌더한다.
5. 저장 형식은 향후 서버 동기화를 고려해 **버전 필드(version)**를 포함한다.

---

## 4) 데이터 모델 제안

```ts
interface FontAsset {
  id: string;
  family: string;            // 예: "Pretendard Custom"
  sourceType: 'data-url' | 'project-asset' | 'remote-url';
  source: string;            // data:, /assets/fonts/xxx.woff2, https://...
  format?: 'woff2' | 'woff' | 'truetype' | 'opentype';
  weight?: string;           // "400", "700" 등
  style?: 'normal' | 'italic';
  unicodeRange?: string;
  display?: 'swap' | 'fallback' | 'block' | 'optional';
  createdAt: string;
}

interface FontRegistry {
  version: 1;
  fonts: FontAsset[];
}
```

저장 우선순위:
- 1차: 프로젝트 상태(내보내기 포함 가능)
- 2차: localStorage 캐시(편집 중 임시)

---

## 5) 단계별 실행 계획

### Phase A. 레지스트리/서비스 계층 정리

- `font registry` 관리 모듈 작성(읽기/쓰기/검증/중복 처리)
- `@font-face CSS` 생성 유틸과 WebGL 로더 입력 생성 유틸 분리
- 파일 확장자/포맷 검증, 파일 크기 제한 정책 추가

**산출물**
- 공용 유틸/타입
- 레지스트리 단위 테스트

### Phase B. Builder UX

- Typography 섹션에 `폰트 추가` 명시 버튼 제공
- 업로드 후 family명/weight/style 입력 가능한 최소 폼 제공
- 폰트 목록: 기본 폰트 + 커스텀 폰트 그룹화 표시
- 삭제/교체(동일 family 덮어쓰기) UX 제공

**산출물**
- 스타일 패널 UI 반영
- 사용자 액션(추가/삭제/선택) E2E 시나리오

### Phase C. WebGL 반영

- WebGL 텍스트 렌더러가 레지스트리 기반 폰트를 우선 조회
- 필요 시 폰트 로드 완료 이벤트 후 재렌더 트리거
- 로드 실패 시 fallback 체인 명확화

**산출물**
- 컴포넌트별 폰트 적용 검증(대표 5종)

### Phase D. Preview/Publish 런타임 반영

- Preview srcdoc 생성 시 레지스트리의 `@font-face` 포함
- Publish 앱 초기화 시 레지스트리 로드 후 head 주입
- 세션 프리뷰/새 탭 프리뷰 간 레지스트리 전달 방식 통일

**산출물**
- 미리보기/퍼블리시 동일 렌더 확인

### Phase E. 정적 Export(핵심)

- 정적 HTML 내 인라인 방식(data-url)과 자산 복사 방식(assets/fonts) 중 전략 확정
- 권장: 기본은 `assets/fonts/*` 파일 생성 + HTML/CSS에 상대 경로 연결
- Export 메타에 폰트 목록 포함

**산출물**
- 산출물 구조 예시
  - `index.html`
  - `assets/fonts/*.woff2`
- 오프라인 환경에서 폰트 정상 동작 확인

---

## 6) 수용 기준(Acceptance Criteria)

1. 사용자 폰트 업로드 후 Typography 폰트 리스트에서 즉시 보인다.
2. 같은 요소가 Builder(WebGL), Preview, Publish에서 동일 family로 렌더된다.
3. 정적 export 파일만 별도 서버에 올려도 커스텀 폰트가 깨지지 않는다.
4. 폰트 로드 실패 시 UI 깨짐 없이 fallback 폰트로 렌더된다.
5. 프로젝트 재진입 시 폰트 목록/적용 상태가 유지된다.

---

## 7) 테스트 계획

- 단위 테스트
  - 포맷 추론, CSS 생성, 레지스트리 머지/중복 처리
- 통합 테스트
  - 스타일 패널 선택 → 요소 style 반영 → 렌더 반영
- E2E 테스트
  - 업로드 → 적용 → Preview 확인 → Publish 확인
- 수동 확인
  - 정적 export 결과를 로컬 파일 서버에서 열어 폰트 확인

---

## 8) 리스크 및 대응

- **리스크:** Data URL 사용 시 용량 증가
  - **대응:** Export 단계에서 파일 자산 분리 기본화
- **리스크:** 브라우저/Canvas 폰트 로딩 타이밍 차이
  - **대응:** 로딩 완료 신호 기반 재측정/재렌더
- **리스크:** 폰트 라이선스 문제
  - **대응:** 업로드 시 라이선스 확인 안내 문구 추가

---

## 9) 구현 순서 제안

1. 레지스트리 정리(Phase A)
2. 스타일 패널 UX 보완(Phase B)
3. WebGL 로딩/재렌더 안정화(Phase C)
4. Preview/Publish 통합(Phase D)
5. 정적 Export 자산화(Phase E)

---

## 10) 코드 수정 시작 전 체크리스트

- [ ] 계획서 리뷰 승인
- [ ] Export 산출물 포맷(data-url vs assets/fonts) 최종 결정
- [ ] 용량 제한/허용 확장자 정책 확정
- [ ] 테스트 범위(필수 E2E 시나리오) 확정
