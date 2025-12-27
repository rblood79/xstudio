# Mock API Endpoints

XStudio에서 사용 가능한 Mock API 엔드포인트 목록입니다. 각 엔드포인트는 서로 다른 데이터 타입과 컬럼 구조를 반환합니다.

## 📋 전체 엔드포인트 목록

### 🔐 권한 및 역할 관리

#### `/permissions` - 권한 목록
- **타입**: `MockPermission[]`
- **컬럼**:
  - `id` (string) - 권한 ID
  - `name` (string) - 권한 이름
  - `description` (string) - 권한 설명
  - `category` (string) - 카테고리 (user/project/organization/security/billing)

#### `/roles` - 역할 목록
- **타입**: `MockRole[]`
- **컬럼**:
  - `id` (string) - 역할 ID
  - `name` (string) - 역할 이름
  - `description` (string) - 역할 설명
  - `scope` (string) - 범위 (global/project)
  - `permissionIds` (string[]) - 권한 ID 배열

### 🏢 조직 및 부서

#### `/organizations` - 조직 목록
- **타입**: `MockOrganization[]`
- **컬럼**:
  - `id` (string) - 조직 ID
  - `name` (string) - 조직 이름
  - `industry` (string) - 산업 분류
  - `domain` (string) - 도메인
  - `plan` (string) - 플랜 (무료/프로/엔터프라이즈)
  - `createdAt` (string) - 생성일시
  - `primaryContactUserId` (string?) - 주 담당자 ID

#### `/departments` - 부서 목록
- **타입**: `MockDepartment[]`
- **컬럼**:
  - `id` (string) - 부서 ID
  - `organizationId` (string) - 소속 조직 ID
  - `name` (string) - 부서 이름
  - `description` (string) - 부서 설명
  - `managerUserId` (string?) - 부서장 ID

### 📁 프로젝트

#### `/projects` - 프로젝트 목록
- **타입**: `MockProject[]`
- **컬럼**:
  - `id` (string) - 프로젝트 ID
  - `organizationId` (string) - 소속 조직 ID
  - `departmentId` (string) - 소속 부서 ID
  - `name` (string) - 프로젝트 이름
  - `status` (string) - 상태 (준비/진행중/보류/완료)
  - `startDate` (string) - 시작일
  - `endDate` (string) - 종료일
  - `budget` (number) - 예산
  - `clientName` (string) - 클라이언트명
  - `visibility` (string) - 공개 범위 (private/internal/public)

#### `/project-memberships` - 프로젝트 멤버십
- **타입**: `MockProjectMembership[]`
- **컬럼**:
  - `id` (string) - 멤버십 ID
  - `projectId` (string) - 프로젝트 ID
  - `userId` (string) - 사용자 ID
  - `roleId` (string) - 역할 ID
  - `allocation` (number) - 할당률 (%)
  - `billable` (boolean) - 과금 여부
  - `joinedAt` (string) - 참여일시
  - `lastActiveAt` (string) - 마지막 활동일시

### 👥 사용자

#### `/users` - 개발자 및 디자이너
- **타입**: `MockUserData[]` (필터링됨)
- **필터**: 개발자, 디자이너, 분석가
- **컬럼**:
  - `num` (number) - 번호
  - `id` (string) - 사용자 ID
  - `name` (string) - 이름
  - `email` (string) - 이메일
  - `address` (string) - 주소
  - `phone` (string) - 전화번호
  - `company` (string) - 회사명
  - `role` (string) - 직무
  - `organizationId` (string) - 소속 조직 ID
  - `departmentId` (string) - 소속 부서 ID
  - `roleId` (string) - 역할 ID
  - `status` (string) - 상태 (활성/초대중/휴면/중지)
  - `jobLevel` (string) - 직급 (주니어/미들/시니어/리드/디렉터)
  - `timezone` (string) - 타임존
  - `locale` (string) - 로케일
  - `createdAt` (string) - 생성일시
  - `lastLoginAt` (string) - 마지막 로그인
  - `projectMembershipIds` (string[]) - 프로젝트 멤버십 ID 배열

#### `/admins` - 관리자
- **타입**: `MockUserData[]` (필터링됨)
- **필터**: 매니저, 아키텍트, 보안 전문가
- **컬럼**: `/users`와 동일

#### `/developers` - 개발자만
- **타입**: `MockUserData[]` (필터링됨)
- **필터**: 역할에 "개발자" 포함
- **컬럼**: `/users`와 동일

#### `/managers` - 매니저만
- **타입**: `MockUserData[]` (필터링됨)
- **필터**: 역할에 "매니저" 포함
- **컬럼**: `/users`와 동일

#### `/companies` - 회사 목록
- **타입**: 커스텀 (중복 제거)
- **컬럼**:
  - `id` (number) - 회사 ID
  - `name` (string) - 회사 이름
  - `company` (string) - 회사명 (중복)
  - `employeeCount` (number) - 직원 수

#### `/company-employees` - 특정 회사 직원
- **타입**: `MockUserData[]` (필터링됨)
- **필터**: 테크노베이션, 디지털솔루션, 스마트시스템즈
- **컬럼**: `/users`와 동일

### 📝 감사 및 초대

#### `/audit-logs` - 감사 로그
- **타입**: `MockAuditLog[]`
- **컬럼**:
  - `id` (string) - 로그 ID
  - `actorUserId` (string) - 실행자 ID
  - `organizationId` (string) - 조직 ID
  - `entityType` (string) - 엔티티 타입
  - `entityId` (string) - 엔티티 ID
  - `action` (string) - 액션
  - `description` (string) - 설명
  - `timestamp` (string) - 시간
  - `ipAddress` (string) - IP 주소

#### `/invitations` - 초대 목록
- **타입**: `MockInvitation[]`
- **컬럼**:
  - `id` (string) - 초대 ID
  - `organizationId` (string) - 조직 ID
  - `email` (string) - 이메일
  - `roleId` (string) - 역할 ID
  - `inviterUserId` (string) - 초대자 ID
  - `status` (string) - 상태 (pending/accepted/expired/revoked)
  - `expiresAt` (string) - 만료일시
  - `createdAt` (string) - 생성일시

### 🔧 엔진 및 부품 (BOM)

#### `/engines` - 엔진 목록
- **타입**: `MockEngine[]`
- **컬럼**:
  - `id` (string) - 엔진 ID
  - `projectId` (string) - 프로젝트 ID
  - `name` (string) - 엔진 이름
  - `code` (string) - 엔진 코드
  - `version` (string) - 버전
  - `status` (string) - 상태 (설계/제작/테스트/양산/단종)
  - `manufacturer` (string) - 제조사
  - `specifications` (object) - 스펙 (power/weight/dimensions)
  - `createdAt` (string) - 생성일시
  - `updatedAt` (string) - 수정일시
  - `createdBy` (string) - 생성자 ID

#### `/components` - 부품 목록 (계층 구조)
- **타입**: `MockComponent[]`
- **컬럼**:
  - `id` (string) - 부품 ID
  - `engineId` (string) - 엔진 ID
  - `parentId` (string?) - 부모 부품 ID
  - `name` (string) - 부품 이름
  - `code` (string) - 부품 코드
  - `type` (string) - 타입 (assembly/part)
  - `level` (number) - 계층 레벨
  - `orderIndex` (number) - 정렬 순서
  - `quantity` (number) - 수량
  - `unit` (string) - 단위 (EA/SET/M/KG/L)
  - `supplier` (string) - 공급업체
  - `cost` (number) - 비용
  - `leadTime` (number) - 리드타임 (일)
  - `status` (string) - 상태 (정상/단종/검토중/승인대기)
  - `specifications` (object?) - 스펙 (material/color 등)
  - `notes` (string?) - 비고
  - `createdAt` (string) - 생성일시
  - `updatedAt` (string) - 수정일시

## 🔄 페이지네이션

모든 엔드포인트는 페이지네이션을 지원합니다:

```typescript
// 페이지네이션 파라미터
{
  page: 1,      // 페이지 번호 (1부터 시작)
  limit: 20     // 페이지당 항목 수
}

// 전체 데이터 요청
{
  getAll: true  // 모든 데이터 반환
}
```

## 📊 데이터 통계

- **Organizations**: 10개
- **Departments**: 30-60개 (조직당 3-6개)
- **Projects**: 60개
- **Users**: 10,000개
- **Permissions**: 8개
- **Roles**: 6개
- **Project Memberships**: ~540개
- **Audit Logs**: 500개
- **Invitations**: 200개
- **Engines**: ~120개 (프로젝트당 1-3개)
- **Components**: 수천 개 (계층 구조, 최대 깊이 5)

## 🎯 사용 예시

### Table 컴포넌트에서 사용

1. **Data Source**: `REST API` 선택
2. **API Collection** 설정:
   - **Base URL**: `MOCK_DATA`
   - **Endpoint Path**: `/permissions` (또는 원하는 엔드포인트)
3. 자동으로 해당 엔드포인트의 데이터 구조에 맞는 컬럼 생성

### 엔드포인트 변경 시

- Endpoint Path를 `/users`에서 `/departments`로 변경하면
- 자동으로 Department 데이터 구조 (id, organizationId, name, description 등)의 컬럼이 생성됨
- 기존 User 데이터 구조 (name, email, phone 등)의 컬럼과 완전히 다른 구조

## 🛠️ 트러블슈팅

### 모든 엔드포인트가 동일한 컬럼 반환?
✅ **해결됨** - 각 엔드포인트가 고유한 데이터 타입과 컬럼 구조를 반환하도록 수정됨

### 새로고침 없이 데이터 업데이트?
✅ **해결됨** - DataSourceSelector와 APICollectionEditor에서 Table props를 즉시 업데이트하도록 수정됨

### REST API 선택 시 기존 컬럼이 남아있음?
✅ **해결됨** - 다음 3가지 수정으로 완전 해결:
1. **Layer 트리 필터링**: `deleted: true`인 Column 요소를 렌더링에서 제외
2. **데이터베이스 삭제**: REST API 선택 시 Column 요소들을 DB에서 실제 삭제
3. **Preview 필터링**: Preview 렌더링 시 삭제된 Column 제외
