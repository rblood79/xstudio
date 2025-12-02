/**
 * DataTable Preset Definitions
 *
 * /mocks 데이터 타입들을 DataTable Preset으로 변환
 * 각 Preset은 스키마 + 샘플 데이터 생성 함수를 포함
 *
 * @see docs/features/DATATABLE_PRESET_SYSTEM.md
 * @see src/services/api/mocks/mockLargeDataV2.ts (원본 데이터)
 */

import type { DataTablePreset } from "./types";

// ============================================
// Utility Helpers (from mockLargeDataV2.ts)
// ============================================

const randomFromArray = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomId = (prefix = ""): string => {
  const length = randomInt(8, 16);
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = prefix;
  for (let i = prefix.length; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getRandomDateWithinYears = (yearsBack: number): Date => {
  const now = new Date();
  const past = new Date();
  past.setFullYear(now.getFullYear() - yearsBack);
  const randomTime = randomInt(past.getTime(), now.getTime());
  return new Date(randomTime);
};

const formatDate = (date: Date): string => date.toISOString();

// ============================================
// Sample Data Arrays
// ============================================

const companies = [
  "테크노베이션", "디지털솔루션", "스마트시스템즈", "퓨처테크", "이노베이션랩",
  "클라우드웍스", "데이터인사이트", "넥스트제너레이션", "글로벌소프트", "크리에이티브스튜디오",
];

const jobTitles = [
  "프론트엔드 개발자", "백엔드 개발자", "풀스택 개발자", "데이터 엔지니어", "DevOps 엔지니어",
  "UI/UX 디자이너", "프로젝트 매니저", "제품 관리자", "QA 엔지니어", "시스템 아키텍트",
];

const lastNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const firstNames = ["민준", "서준", "예준", "도윤", "시우", "서연", "서윤", "지우", "하은", "수빈"];

const industries = ["IT 서비스", "제조", "금융", "교육", "헬스케어", "컨설팅", "미디어"];
const departmentNames = ["연구개발", "영업", "인사", "재무", "고객지원", "제품관리", "디자인", "품질관리"];

const userStatuses = ["활성", "초대중", "휴면", "중지"];
const jobLevels = ["주니어", "미들", "시니어", "리드", "디렉터"];
const projectStatuses = ["준비", "진행중", "보류", "완료"];

const productCategories = ["전자기기", "의류", "식품", "가구", "스포츠", "도서", "화장품"];
const orderStatuses = ["대기", "처리중", "배송중", "완료", "취소"];

// ============================================
// Sample Data Generators
// ============================================

const generateUsers = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("usr_"),
    num: i + 1,
    name: `${randomFromArray(lastNames)}${randomFromArray(firstNames)}`,
    email: `user${i + 1}@${randomFromArray(["company.com", "example.org", "mail.co.kr"])}`,
    phone: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
    company: randomFromArray(companies),
    role: randomFromArray(jobTitles),
    status: randomFromArray(userStatuses),
    jobLevel: randomFromArray(jobLevels),
    createdAt: formatDate(getRandomDateWithinYears(2)),
  }));

const generateRoles = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("role_"),
    name: ["관리자", "편집자", "뷰어", "게스트", "슈퍼관리자"][i % 5],
    description: ["전체 관리 권한", "콘텐츠 편집 가능", "읽기 전용", "제한된 접근", "최고 권한"][i % 5],
    scope: randomFromArray(["global", "project"]),
    permissionIds: Array.from({ length: randomInt(2, 5) }, () => getRandomId("perm_")),
  }));

const generatePermissions = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("perm_"),
    name: ["사용자 보기", "사용자 관리", "프로젝트 보기", "프로젝트 편집", "설정 관리"][i % 5],
    description: ["사용자 목록 조회", "사용자 생성/수정/삭제", "프로젝트 조회", "프로젝트 수정", "시스템 설정 변경"][i % 5],
    category: randomFromArray(["user", "project", "organization", "security", "billing"]),
  }));

const generateInvitations = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("inv_"),
    email: `invited${i + 1}@example.com`,
    roleId: getRandomId("role_"),
    inviterUserId: getRandomId("usr_"),
    status: randomFromArray(["pending", "accepted", "expired", "revoked"]),
    expiresAt: formatDate(new Date(Date.now() + randomInt(1, 30) * 24 * 60 * 60 * 1000)),
    createdAt: formatDate(getRandomDateWithinYears(1)),
  }));

const generateOrganizations = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("org_"),
    name: randomFromArray(companies),
    industry: randomFromArray(industries),
    domain: `company${i + 1}.com`,
    plan: randomFromArray(["무료", "프로", "엔터프라이즈"]),
    createdAt: formatDate(getRandomDateWithinYears(3)),
  }));

const generateDepartments = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("dept_"),
    organizationId: getRandomId("org_"),
    name: departmentNames[i % departmentNames.length],
    description: `${departmentNames[i % departmentNames.length]} 부서입니다.`,
    managerUserId: getRandomId("usr_"),
  }));

const generateProjects = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("proj_"),
    organizationId: getRandomId("org_"),
    departmentId: getRandomId("dept_"),
    name: `프로젝트 ${i + 1}`,
    status: randomFromArray(projectStatuses),
    startDate: formatDate(getRandomDateWithinYears(1)),
    endDate: formatDate(new Date(Date.now() + randomInt(30, 365) * 24 * 60 * 60 * 1000)),
    budget: randomInt(1000, 50000) * 10000,
    clientName: randomFromArray(companies),
    visibility: randomFromArray(["private", "internal", "public"]),
  }));

const generateProducts = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("prod_"),
    name: `상품 ${i + 1}`,
    price: randomInt(1000, 100000),
    stock: randomInt(0, 500),
    category: randomFromArray(productCategories),
    description: `상품 ${i + 1}에 대한 설명입니다.`,
    imageUrl: `https://picsum.photos/200/200?random=${i}`,
    isActive: Math.random() > 0.2,
    createdAt: formatDate(getRandomDateWithinYears(2)),
  }));

const generateCategories = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("cat_"),
    name: productCategories[i % productCategories.length],
    parentId: i > 3 ? getRandomId("cat_") : null,
    description: `${productCategories[i % productCategories.length]} 카테고리`,
    order: i + 1,
    isActive: true,
  }));

const generateOrders = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, () => ({
    id: getRandomId("ord_"),
    userId: getRandomId("usr_"),
    items: Array.from({ length: randomInt(1, 5) }, () => ({
      productId: getRandomId("prod_"),
      quantity: randomInt(1, 10),
      price: randomInt(1000, 50000),
    })),
    total: randomInt(10000, 500000),
    status: randomFromArray(orderStatuses),
    shippingAddress: `서울시 ${randomFromArray(["강남구", "서초구", "마포구", "송파구"])}`,
    createdAt: formatDate(getRandomDateWithinYears(1)),
  }));

const generateEngines = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("eng_"),
    projectId: getRandomId("proj_"),
    name: `엔진 ${i + 1}`,
    code: `ENG-${String(i + 1).padStart(4, "0")}`,
    version: `v${randomInt(1, 5)}.${randomInt(0, 9)}`,
    status: randomFromArray(["설계", "제작", "테스트", "양산", "단종"]),
    manufacturer: randomFromArray(["현대모비스", "LG전자", "삼성SDI", "만도", "한온시스템"]),
    specifications: {
      power: `${randomInt(50, 500)}kW`,
      weight: `${randomInt(100, 1000)}kg`,
      dimensions: `${randomInt(50, 200)}x${randomInt(50, 200)}x${randomInt(50, 200)}cm`,
    },
    createdAt: formatDate(getRandomDateWithinYears(2)),
  }));

const generateComponents = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("comp_"),
    engineId: getRandomId("eng_"),
    parentId: i > 5 ? getRandomId("comp_") : null,
    name: `부품 ${i + 1}`,
    code: `COMP-${String(i + 1).padStart(4, "0")}`,
    type: randomFromArray(["assembly", "part"]),
    level: randomInt(0, 5),
    orderIndex: i + 1,
    quantity: randomInt(1, 100),
    unit: randomFromArray(["EA", "SET", "M", "KG", "L"]),
    supplier: randomFromArray(["현대위아", "대원강업", "세원정공", "화신", "동희오토"]),
    cost: randomInt(100, 10000),
    leadTime: randomInt(1, 30),
    status: randomFromArray(["정상", "단종", "검토중", "승인대기"]),
  }));

const generateAuditLogs = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: getRandomId("log_"),
    actorUserId: getRandomId("usr_"),
    organizationId: getRandomId("org_"),
    entityType: randomFromArray(["user", "project", "organization", "department"]),
    entityId: getRandomId(),
    action: randomFromArray(["생성", "수정", "삭제", "권한 변경", "로그인"]),
    description: `작업 ${i + 1}에 대한 로그`,
    timestamp: formatDate(getRandomDateWithinYears(1)),
    ipAddress: `${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`,
  }));

const generateProjectMemberships = (count: number): Record<string, unknown>[] =>
  Array.from({ length: count }, () => ({
    id: getRandomId("mem_"),
    projectId: getRandomId("proj_"),
    userId: getRandomId("usr_"),
    roleId: getRandomId("role_"),
    allocation: randomInt(10, 100),
    billable: Math.random() > 0.3,
    joinedAt: formatDate(getRandomDateWithinYears(2)),
    lastActiveAt: formatDate(getRandomDateWithinYears(0.5)),
  }));

// ============================================
// Preset Definitions
// ============================================

export const DATATABLE_PRESETS: Record<string, DataTablePreset> = {
  // ========== Users & Auth ==========
  users: {
    id: "users",
    name: "Users",
    description: "사용자 정보 관리",
    category: "users-auth",
    icon: "User",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "num", type: "number", label: "번호" },
      { key: "name", type: "string", label: "이름", required: true },
      { key: "email", type: "email", label: "이메일", required: true },
      { key: "phone", type: "string", label: "전화번호" },
      { key: "company", type: "string", label: "회사" },
      { key: "role", type: "string", label: "직책" },
      { key: "status", type: "string", label: "상태" },
      { key: "jobLevel", type: "string", label: "직급" },
      { key: "createdAt", type: "datetime", label: "생성일" },
    ],
    generateSampleData: generateUsers,
    defaultSampleCount: 10,
  },

  roles: {
    id: "roles",
    name: "Roles",
    description: "역할 및 권한 그룹 정의",
    category: "users-auth",
    icon: "Key",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "name", type: "string", label: "역할명", required: true },
      { key: "description", type: "string", label: "설명" },
      { key: "scope", type: "string", label: "범위" },
      { key: "permissionIds", type: "array", label: "권한 목록" },
    ],
    generateSampleData: generateRoles,
    defaultSampleCount: 5,
  },

  permissions: {
    id: "permissions",
    name: "Permissions",
    description: "세부 권한 정의",
    category: "users-auth",
    icon: "Lock",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "name", type: "string", label: "권한명", required: true },
      { key: "description", type: "string", label: "설명" },
      { key: "category", type: "string", label: "카테고리" },
    ],
    generateSampleData: generatePermissions,
    defaultSampleCount: 10,
  },

  invitations: {
    id: "invitations",
    name: "Invitations",
    description: "사용자 초대 관리",
    category: "users-auth",
    icon: "Mail",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "email", type: "email", label: "이메일", required: true },
      { key: "roleId", type: "string", label: "역할 ID" },
      { key: "inviterUserId", type: "string", label: "초대자 ID" },
      { key: "status", type: "string", label: "상태" },
      { key: "expiresAt", type: "datetime", label: "만료일" },
      { key: "createdAt", type: "datetime", label: "생성일" },
    ],
    generateSampleData: generateInvitations,
    defaultSampleCount: 5,
  },

  // ========== Organization ==========
  organizations: {
    id: "organizations",
    name: "Organizations",
    description: "조직/회사 정보",
    category: "organization",
    icon: "Building2",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "name", type: "string", label: "조직명", required: true },
      { key: "industry", type: "string", label: "산업" },
      { key: "domain", type: "string", label: "도메인" },
      { key: "plan", type: "string", label: "플랜" },
      { key: "createdAt", type: "datetime", label: "생성일" },
    ],
    generateSampleData: generateOrganizations,
    defaultSampleCount: 5,
  },

  departments: {
    id: "departments",
    name: "Departments",
    description: "부서 정보",
    category: "organization",
    icon: "Layers",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "organizationId", type: "string", label: "조직 ID" },
      { key: "name", type: "string", label: "부서명", required: true },
      { key: "description", type: "string", label: "설명" },
      { key: "managerUserId", type: "string", label: "매니저 ID" },
    ],
    generateSampleData: generateDepartments,
    defaultSampleCount: 8,
  },

  projects: {
    id: "projects",
    name: "Projects",
    description: "프로젝트 관리",
    category: "organization",
    icon: "Folder",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "organizationId", type: "string", label: "조직 ID" },
      { key: "departmentId", type: "string", label: "부서 ID" },
      { key: "name", type: "string", label: "프로젝트명", required: true },
      { key: "status", type: "string", label: "상태" },
      { key: "startDate", type: "date", label: "시작일" },
      { key: "endDate", type: "date", label: "종료일" },
      { key: "budget", type: "number", label: "예산" },
      { key: "clientName", type: "string", label: "고객사" },
      { key: "visibility", type: "string", label: "공개범위" },
    ],
    generateSampleData: generateProjects,
    defaultSampleCount: 10,
  },

  // ========== E-commerce ==========
  products: {
    id: "products",
    name: "Products",
    description: "상품 정보",
    category: "ecommerce",
    icon: "Package",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "name", type: "string", label: "상품명", required: true },
      { key: "price", type: "number", label: "가격" },
      { key: "stock", type: "number", label: "재고" },
      { key: "category", type: "string", label: "카테고리" },
      { key: "description", type: "string", label: "설명" },
      { key: "imageUrl", type: "url", label: "이미지" },
      { key: "isActive", type: "boolean", label: "활성" },
      { key: "createdAt", type: "datetime", label: "생성일" },
    ],
    generateSampleData: generateProducts,
    defaultSampleCount: 20,
  },

  categories: {
    id: "categories",
    name: "Categories",
    description: "상품 카테고리",
    category: "ecommerce",
    icon: "Tag",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "name", type: "string", label: "카테고리명", required: true },
      { key: "parentId", type: "string", label: "상위 카테고리 ID" },
      { key: "description", type: "string", label: "설명" },
      { key: "order", type: "number", label: "순서" },
      { key: "isActive", type: "boolean", label: "활성" },
    ],
    generateSampleData: generateCategories,
    defaultSampleCount: 10,
  },

  orders: {
    id: "orders",
    name: "Orders",
    description: "주문 정보",
    category: "ecommerce",
    icon: "ShoppingCart",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "userId", type: "string", label: "사용자 ID" },
      { key: "items", type: "array", label: "주문 항목" },
      { key: "total", type: "number", label: "총액" },
      { key: "status", type: "string", label: "상태" },
      { key: "shippingAddress", type: "string", label: "배송지" },
      { key: "createdAt", type: "datetime", label: "주문일" },
    ],
    generateSampleData: generateOrders,
    defaultSampleCount: 15,
  },

  // ========== Manufacturing ==========
  engines: {
    id: "engines",
    name: "Engines",
    description: "엔진/제품 정보",
    category: "manufacturing",
    icon: "Cpu",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "projectId", type: "string", label: "프로젝트 ID" },
      { key: "name", type: "string", label: "엔진명", required: true },
      { key: "code", type: "string", label: "코드" },
      { key: "version", type: "string", label: "버전" },
      { key: "status", type: "string", label: "상태" },
      { key: "manufacturer", type: "string", label: "제조사" },
      { key: "specifications", type: "object", label: "사양" },
      { key: "createdAt", type: "datetime", label: "생성일" },
    ],
    generateSampleData: generateEngines,
    defaultSampleCount: 5,
  },

  components: {
    id: "components",
    name: "Components",
    description: "부품 (BOM) 정보",
    category: "manufacturing",
    icon: "Wrench",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "engineId", type: "string", label: "엔진 ID" },
      { key: "parentId", type: "string", label: "상위 부품 ID" },
      { key: "name", type: "string", label: "부품명", required: true },
      { key: "code", type: "string", label: "부품 코드" },
      { key: "type", type: "string", label: "유형" },
      { key: "level", type: "number", label: "레벨" },
      { key: "quantity", type: "number", label: "수량" },
      { key: "unit", type: "string", label: "단위" },
      { key: "supplier", type: "string", label: "공급사" },
      { key: "cost", type: "number", label: "비용" },
      { key: "leadTime", type: "number", label: "리드타임 (일)" },
      { key: "status", type: "string", label: "상태" },
    ],
    generateSampleData: generateComponents,
    defaultSampleCount: 20,
  },

  // ========== System ==========
  auditLogs: {
    id: "auditLogs",
    name: "Audit Logs",
    description: "시스템 감사 로그",
    category: "system",
    icon: "FileText",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "actorUserId", type: "string", label: "수행자 ID" },
      { key: "organizationId", type: "string", label: "조직 ID" },
      { key: "entityType", type: "string", label: "엔티티 유형" },
      { key: "entityId", type: "string", label: "엔티티 ID" },
      { key: "action", type: "string", label: "작업" },
      { key: "description", type: "string", label: "설명" },
      { key: "timestamp", type: "datetime", label: "시간" },
      { key: "ipAddress", type: "string", label: "IP 주소" },
    ],
    generateSampleData: generateAuditLogs,
    defaultSampleCount: 20,
  },

  projectMemberships: {
    id: "projectMemberships",
    name: "Project Memberships",
    description: "프로젝트 멤버십 관리",
    category: "system",
    icon: "Users",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "projectId", type: "string", label: "프로젝트 ID" },
      { key: "userId", type: "string", label: "사용자 ID" },
      { key: "roleId", type: "string", label: "역할 ID" },
      { key: "allocation", type: "number", label: "할당량 (%)" },
      { key: "billable", type: "boolean", label: "청구 대상" },
      { key: "joinedAt", type: "datetime", label: "참여일" },
      { key: "lastActiveAt", type: "datetime", label: "마지막 활동" },
    ],
    generateSampleData: generateProjectMemberships,
    defaultSampleCount: 15,
  },
};

/**
 * 카테고리별 Preset 목록 가져오기
 */
export function getPresetsByCategory(
  category: string
): DataTablePreset[] {
  return Object.values(DATATABLE_PRESETS).filter(
    (preset) => preset.category === category
  );
}

/**
 * 모든 Preset 목록 가져오기
 */
export function getAllPresets(): DataTablePreset[] {
  return Object.values(DATATABLE_PRESETS);
}
