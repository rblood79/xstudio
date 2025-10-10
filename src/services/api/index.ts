// 모든 API 서비스들을 통합하여 export
export { BaseApiService } from "./BaseApiService";
export { ElementsApiService, elementsApi } from "./ElementsApiService";
export {
  ProjectsApiService,
  projectsApi,
  type Project,
  type CreateProjectData,
} from "./ProjectsApiService";
export {
  PagesApiService,
  pagesApi,
  type Page,
  type CreatePageData,
} from "./PagesApiService";
import {
  cmsMockData,
  largeMockData,
  mockAuditLogs,
  mockDepartments,
  mockInvitations,
  mockOrganizations,
  mockPermissions,
  mockProjectMemberships,
  mockProjects,
  mockRoles,
  mockEngines,
  mockComponents,
  buildComponentTree,
  getProjectEnginesSummary,
  getComponentTreeDepth,
  getComponentsByLevel,
  getComponentPath,
  getComponentDescendants,
  type CmsMockData,
  type MockAuditLog,
  type MockDepartment,
  type MockInvitation,
  type MockOrganization,
  type MockPermission,
  type MockProject,
  type MockProjectMembership,
  type MockRole,
  type MockUserData,
  type MockEngine,
  type MockComponent,
} from "./mockLargeDataV2";

// 확장된 CMS 목업 데이터 export
export {
  cmsMockData,
  largeMockData,
  mockAuditLogs,
  mockDepartments,
  mockInvitations,
  mockOrganizations,
  mockPermissions,
  mockProjectMemberships,
  mockProjects,
  mockRoles,
  mockEngines,
  mockComponents,
  buildComponentTree,
  getProjectEnginesSummary,
  getComponentTreeDepth,
  getComponentsByLevel,
  getComponentPath,
  getComponentDescendants,
};

export type {
  CmsMockData,
  MockAuditLog,
  MockDepartment,
  MockInvitation,
  MockOrganization,
  MockPermission,
  MockProject,
  MockProjectMembership,
  MockRole,
  MockUserData,
  MockEngine,
  MockComponent,
};

// Import the instances for the ApiService class
import { elementsApi } from "./ElementsApiService";
import { projectsApi } from "./ProjectsApiService";
import { pagesApi } from "./PagesApiService";

// === Mock API Endpoint ===
interface MockApiConfig {
  [key: string]: (
    path: string,
    params?: Record<string, unknown>
  ) => Promise<unknown>;
}

const fetchMockData = async (
  path: string,
  params?: Record<string, unknown>
): Promise<unknown> => {
  console.log("🌐 Fetching mock data from path:", path, "with params:", params);
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // 엔드포인트 경로에 따라 다른 데이터 타입 반환
  if (path === "/permissions" || path === "/api/permissions") {
    return handlePermissionsEndpoint(params);
  } else if (path === "/roles" || path === "/api/roles") {
    return handleRolesEndpoint(params);
  } else if (path === "/departments" || path === "/api/departments") {
    return handleDepartmentsEndpoint(params);
  } else if (path === "/organizations" || path === "/api/organizations") {
    return handleOrganizationsEndpoint(params);
  } else if (path === "/projects" || path === "/api/projects") {
    return handleProjectsEndpoint(params);
  } else if (path === "/project-memberships" || path === "/api/project-memberships") {
    return handleProjectMembershipsEndpoint(params);
  } else if (path === "/audit-logs" || path === "/api/audit-logs") {
    return handleAuditLogsEndpoint(params);
  } else if (path === "/invitations" || path === "/api/invitations") {
    return handleInvitationsEndpoint(params);
  } else if (path === "/engines" || path === "/api/engines") {
    return handleEnginesEndpoint(params);
  } else if (path === "/components" || path === "/api/components") {
    return handleComponentsEndpoint(params);
  } else {
    // 기본: 사용자 데이터
    return handleUsersEndpoint(path, params);
  }
};

// Permissions 엔드포인트 핸들러
const handlePermissionsEndpoint = (params?: Record<string, unknown>) => {
  console.log(`📊 /permissions 엔드포인트: ${mockPermissions.length}개 반환`);
  return applyPagination(mockPermissions, params);
};

// Roles 엔드포인트 핸들러
const handleRolesEndpoint = (params?: Record<string, unknown>) => {
  console.log(`📊 /roles 엔드포인트: ${mockRoles.length}개 반환`);
  return applyPagination(mockRoles, params);
};

// Departments 엔드포인트 핸들러
const handleDepartmentsEndpoint = (params?: Record<string, unknown>) => {
  console.log(`📊 /departments 엔드포인트: ${mockDepartments.length}개 반환`);
  return applyPagination(mockDepartments, params);
};

// Organizations 엔드포인트 핸들러
const handleOrganizationsEndpoint = (params?: Record<string, unknown>) => {
  console.log(`📊 /organizations 엔드포인트: ${mockOrganizations.length}개 반환`);
  return applyPagination(mockOrganizations, params);
};

// Projects 엔드포인트 핸들러
const handleProjectsEndpoint = (params?: Record<string, unknown>) => {
  console.log(`📊 /projects 엔드포인트: ${mockProjects.length}개 반환`);
  return applyPagination(mockProjects, params);
};

// Project Memberships 엔드포인트 핸들러
const handleProjectMembershipsEndpoint = (params?: Record<string, unknown>) => {
  console.log(`📊 /project-memberships 엔드포인트: ${mockProjectMemberships.length}개 반환`);
  return applyPagination(mockProjectMemberships, params);
};

// Audit Logs 엔드포인트 핸들러
const handleAuditLogsEndpoint = (params?: Record<string, unknown>) => {
  console.log(`📊 /audit-logs 엔드포인트: ${mockAuditLogs.length}개 반환`);
  return applyPagination(mockAuditLogs, params);
};

// Invitations 엔드포인트 핸들러
const handleInvitationsEndpoint = (params?: Record<string, unknown>) => {
  console.log(`📊 /invitations 엔드포인트: ${mockInvitations.length}개 반환`);
  return applyPagination(mockInvitations, params);
};

// Engines 엔드포인트 핸들러
const handleEnginesEndpoint = (params?: Record<string, unknown>) => {
  console.log(`📊 /engines 엔드포인트: ${mockEngines.length}개 반환`);
  return applyPagination(mockEngines, params);
};

// Components 엔드포인트 핸들러
const handleComponentsEndpoint = (params?: Record<string, unknown>) => {
  console.log(`📊 /components 엔드포인트: ${mockComponents.length}개 반환`);
  return applyPagination(mockComponents, params);
};

// Users 엔드포인트 핸들러 (기존 로직)
const handleUsersEndpoint = (path: string, params?: Record<string, unknown>) => {
  // 엔드포인트 경로에 따라 다른 데이터 반환
  let filteredData = largeMockData;

  // 특정 엔드포인트 경로에 대한 데이터 필터링
  if (path === "/users" || path === "/api/users") {
    // 사용자 데이터만 반환 (프론트엔드, 백엔드, 풀스택 개발자 등)
    filteredData = largeMockData.filter(
      (user) =>
        user.role.includes("개발자") ||
        user.role.includes("디자이너") ||
        user.role.includes("분석가")
    );
    console.log(
      `📊 /users 엔드포인트: 사용자 데이터 ${filteredData.length}개 반환`
    );
  } else if (
    path === "/admins" ||
    path === "/api/admins" ||
    path === "/api/users/admins"
  ) {
    // 관리자 데이터만 반환 (프로젝트 매니저, 시스템 아키텍트 등)
    filteredData = largeMockData.filter(
      (user) =>
        user.role.includes("매니저") ||
        user.role.includes("아키텍트") ||
        user.role.includes("보안")
    );
    console.log(
      `📊 /admins 엔드포인트: 관리자 데이터 ${filteredData.length}개 반환`
    );
  } else if (path === "/companies" || path === "/api/companies") {
    // 회사 목록만 반환 (중복 제거)
    const uniqueCompanies = [
      ...new Set(largeMockData.map((user) => user.company)),
    ];
    filteredData = uniqueCompanies.map((company, index) => ({
      id: index + 1,
      name: company, // 회사 이름을 name 필드에 매핑
      company: company,
      // 회사별 직원 수 계산
      employeeCount: largeMockData.filter((u) => u.company === company).length,
    })) as unknown as MockUserData[];
    console.log(
      `📊 /companies 엔드포인트: 회사 목록 ${filteredData.length}개 반환`
    );
  } else if (
    path === "/company-employees" ||
    path === "/api/company-employees"
  ) {
    // 회사별 직원 데이터 반환 (기존 동작)
    const targetCompanies = ["테크노베이션", "디지털솔루션", "스마트시스템즈"];
    filteredData = largeMockData.filter((user) =>
      targetCompanies.includes(user.company)
    );
    console.log(
      `📊 /company-employees 엔드포인트: 회사 직원 데이터 ${filteredData.length}개 반환`
    );
  } else if (
    path === "/developers" ||
    path === "/api/developers" ||
    path === "/api/users/developers"
  ) {
    // 개발자만 반환
    filteredData = largeMockData.filter((user) => user.role.includes("개발자"));
    console.log(
      `📊 /developers 엔드포인트: 개발자 데이터 ${filteredData.length}개 반환`
    );
  } else if (
    path === "/managers" ||
    path === "/api/managers" ||
    path === "/api/users/managers"
  ) {
    // 매니저만 반환
    filteredData = largeMockData.filter((user) => user.role.includes("매니저"));
    console.log(
      `📊 /managers 엔드포인트: 매니저 데이터 ${filteredData.length}개 반환`
    );
  } else if (path === "/products" || path === "/api/products") {
    // 제품 관련 데이터 (향후 확장을 위해 추가)
    filteredData = largeMockData.filter(
      (user) =>
        user.role.includes("제품") ||
        user.role.includes("기획") ||
        user.role.includes("디자이너")
    );
    console.log(
      `📊 /products 엔드포인트: 제품 관련 데이터 ${filteredData.length}개 반환`
    );
  } else {
    // 기본적으로 모든 데이터 반환 (기존 동작 유지)
    console.log(
      `📊 기본 엔드포인트 또는 알 수 없는 경로: 전체 데이터 ${filteredData.length}개 반환`
    );
  }

  // Simulate filtering if 'search' param is provided
  if (params && typeof params.search === "string") {
    const searchTerm = params.search.toLowerCase();
    filteredData = largeMockData.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.company.toLowerCase().includes(searchTerm) ||
        user.role.toLowerCase().includes(searchTerm)
    );
  }

  return applyPagination(filteredData, params);
};

// 페이지네이션 공통 로직
const applyPagination = <T,>(
  data: T[],
  params?: Record<string, unknown>
): T[] => {
  // 전체 데이터 요청 확인
  if (params && params.getAll === true) {
    console.log(`📊 Returning all data: ${data.length} items`);
    return data;
  }

  // 페이지네이션 지원 (page/limit 방식)
  if (
    params &&
    typeof params.page === "number" &&
    typeof params.limit === "number"
  ) {
    const page = params.page;
    const limit = params.limit;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const totalItems = data.length;
    const returnedItems = Math.min(endIndex, totalItems) - startIndex;

    console.log(
      `📄 Pagination: page ${page}, limit ${limit}, startIndex ${startIndex}, endIndex ${endIndex}`
    );
    console.log(
      `📊 Total data: ${totalItems}, returning: ${returnedItems} items`
    );

    // 페이지네이션을 위해 전체 데이터 개수 정보를 포함한 객체 반환
    const result = data.slice(startIndex, endIndex);

    // 페이지네이션을 위한 메타데이터 추가
    Object.assign(result, {
      __meta: {
        totalItems,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: endIndex < totalItems,
        startIndex,
        endIndex,
      },
    });

    return result;
  }

  // 기본적으로 모든 데이터 반환 (기존 동작 유지)
  console.log(`📊 Returning all data (default): ${data.length} items`);
  return data;
};

export const apiConfig: MockApiConfig = {
  MOCK_DATA: fetchMockData,
  // 여기에 다른 Mock API 또는 실제 API 매핑을 추가할 수 있습니다.
};

// 통합 API 응답 타입
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// 공통 에러 핸들링 함수
export const handleApiError = (
  error: unknown,
  operation: string
): ApiResponse<null> => {
  console.error(`${operation} 실패:`, error);
  return {
    data: null,
    error:
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.",
    success: false,
  };
};

// API 서비스 통합 클래스 (선택적)
export class ApiService {
  static elements = elementsApi;
  static projects = projectsApi;
  static pages = pagesApi;
}
