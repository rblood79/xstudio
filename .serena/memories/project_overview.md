# XStudio 프로젝트 개요

## 프로젝트 목적
XStudio는 React, TypeScript, Vite, Supabase를 사용하는 웹 기반 UI 빌더/디자인 스튜디오입니다. 사용자가 시각적으로 웹 UI를 구성하고 편집할 수 있는 도구입니다.

## 주요 기능
- 빌더: 메인 편집 환경 (사이드바, 인스펙터, 프리뷰)
- 사이드바: 페이지와 요소 계층 구조 관리
- 인스펙터: 선택된 요소의 속성 편집
- 프리뷰: 실시간 변경사항 표시 (iframe 기반)
- 오버레이: 선택된 요소 시각적 표시

## 주요 라우트
- `/`: 메인 페이지
- `/signin`: 로그인 페이지  
- `/dashboard`: 대시보드 (인증 필요)
- `/builder/:projectId`: 빌더 편집 환경 (인증 필요)
- `/preview/:projectId`: 프리뷰 화면 (인증 필요)

## 아키텍처 패턴
- Zustand를 이용한 클라이언트 상태 관리
- Supabase 싱글톤 패턴으로 백엔드 데이터 저장
- iframe 기반 프리뷰와 postMessage 통신
- 데이터 흐름: UI 액션 → Zustand 상태 업데이트 → Supabase API 직접 호출