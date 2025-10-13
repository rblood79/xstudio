export interface MockPermission {
  id: string;
  name: string;
  description: string;
  category: "user" | "project" | "organization" | "security" | "billing";
}

export interface MockRole {
  id: string;
  name: string;
  description: string;
  scope: "global" | "project";
  permissionIds: string[];
}

export interface MockOrganization {
  id: string;
  name: string;
  industry: string;
  domain: string;
  plan: "무료" | "프로" | "엔터프라이즈";
  createdAt: string;
  primaryContactUserId?: string;
}

export interface MockDepartment {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  managerUserId?: string;
}

export interface MockProject {
  id: string;
  organizationId: string;
  departmentId: string;
  name: string;
  status: "준비" | "진행중" | "보류" | "완료";
  startDate: string;
  endDate: string;
  budget: number;
  clientName: string;
  visibility: "private" | "internal" | "public";
}

export interface MockProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  roleId: string;
  allocation: number;
  billable: boolean;
  joinedAt: string;
  lastActiveAt: string;
}

export interface MockAuditLog {
  id: string;
  actorUserId: string;
  organizationId: string;
  entityType:
    | "user"
    | "project"
    | "organization"
    | "department"
    | "permission"
    | "role";
  entityId: string;
  action: string;
  description: string;
  timestamp: string;
  ipAddress: string;
}

export interface MockInvitation {
  id: string;
  organizationId: string;
  email: string;
  roleId: string;
  inviterUserId: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: string;
  createdAt: string;
}

export interface MockEngine {
  id: string;
  projectId: string;
  name: string;
  code: string;
  version: string;
  status: "설계" | "제작" | "테스트" | "양산" | "단종";
  manufacturer: string;
  specifications: {
    power?: string;
    weight?: string;
    dimensions?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface MockComponent {
  id: string;
  engineId: string;
  parentId: string | null;
  name: string;
  code: string;
  type: "assembly" | "part";
  level: number;
  orderIndex: number;
  quantity: number;
  unit: "EA" | "SET" | "M" | "KG" | "L";
  supplier: string;
  cost: number;
  leadTime: number;
  status: "정상" | "단종" | "검토중" | "승인대기";
  specifications?: {
    material?: string;
    color?: string;
    [key: string]: string | undefined;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockUserData {
  num: number;
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  company: string;
  role: string;
  organizationId: string;
  departmentId: string;
  roleId: string;
  status: "활성" | "초대중" | "휴면" | "중지";
  jobLevel: "주니어" | "미들" | "시니어" | "리드" | "디렉터";
  timezone: string;
  locale: string;
  createdAt: string;
  lastLoginAt: string;
  projectMembershipIds: string[];
}

export interface CmsMockData {
  permissions: MockPermission[];
  roles: MockRole[];
  organizations: MockOrganization[];
  departments: MockDepartment[];
  projects: MockProject[];
  users: MockUserData[];
  projectMemberships: MockProjectMembership[];
  auditLogs: MockAuditLog[];
  invitations: MockInvitation[];
  engines: MockEngine[];
  components: MockComponent[];
}

// Utility helpers
const randomFromArray = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomFourDigits = (): string => {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
};

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

// 향후 사용을 위해 유지 (현재 미사용)
// const addMonths = (date: Date, months: number): Date => {
//   const result = new Date(date.getTime());
//   result.setMonth(result.getMonth() + months);
//   return result;
// };

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
};

const formatDate = (date: Date): string => date.toISOString();

const companies = [
  "테크노베이션",
  "디지털솔루션",
  "스마트시스템즈",
  "퓨처테크",
  "이노베이션랩",
  "클라우드웍스",
  "데이터인사이트",
  "넥스트제너레이션",
  "글로벌소프트",
  "크리에이티브스튜디오",
  "인텔리전스그룹",
  "비즈니스파트너스",
  "엔터프라이즈솔루션",
  "스마트플랫폼",
  "디지털이노베이션",
];

const jobTitles = [
  "프론트엔드 개발자",
  "백엔드 개발자",
  "풀스택 개발자",
  "데이터 엔지니어",
  "데이터 분석가",
  "DevOps 엔지니어",
  "UI/UX 디자이너",
  "프로젝트 매니저",
  "제품 관리자",
  "QA 엔지니어",
  "시스템 아키텍트",
  "보안 전문가",
  "마케팅 매니저",
  "영업 전문가",
  "인사 담당자",
];

const lastNames = [
  "김",
  "이",
  "박",
  "최",
  "정",
  "강",
  "조",
  "윤",
  "장",
  "임",
  "한",
  "오",
  "서",
  "신",
  "권",
  "황",
  "안",
  "송",
  "류",
  "홍",
];

const firstNames = [
  "민준",
  "서준",
  "예준",
  "도윤",
  "시우",
  "주원",
  "하준",
  "지호",
  "준서",
  "건우",
  "서연",
  "서윤",
  "지우",
  "서현",
  "민서",
  "하은",
  "수빈",
  "지민",
  "지유",
  "채원",
  "현우",
  "승우",
  "지훈",
  "준영",
  "민재",
  "은우",
  "유준",
  "정우",
  "승현",
  "시윤",
  "다은",
  "예은",
  "소율",
  "윤서",
  "채은",
  "지원",
  "수아",
  "시은",
  "연우",
  "지안",
];

const ENGINE_TYPES = [
  "전기 모터",
  "가솔린 엔진",
  "디젤 엔진",
  "하이브리드 엔진",
  "터보 엔진",
  "수소 연료전지",
  "로터리 엔진",
  "V6 엔진",
  "V8 엔진",
  "직렬 4기통",
];

const ENGINE_MANUFACTURERS = [
  "현대모비스",
  "LG전자",
  "삼성SDI",
  "만도",
  "한온시스템",
  "LS일렉트릭",
  "효성중공업",
  "Bosch",
  "Continental",
  "Denso",
];

const COMPONENT_ASSEMBLIES = [
  {
    name: "동력 전달 시스템",
    parts: ["변속기", "클러치", "드라이브 샤프트", "차동 장치", "휠 허브"],
  },
  {
    name: "냉각 시스템",
    parts: ["라디에이터", "워터 펌프", "쿨링 팬", "서모스탯", "냉각수 호스"],
  },
  {
    name: "연료 시스템",
    parts: ["연료 펌프", "인젝터", "연료 필터", "연료 탱크", "연료 라인"],
  },
  {
    name: "전기 시스템",
    parts: ["배터리", "알터네이터", "스타터 모터", "점화 코일", "배선 하네스"],
  },
  {
    name: "흡기 시스템",
    parts: [
      "에어 필터",
      "흡기 매니폴드",
      "스로틀 바디",
      "터보차저",
      "인터쿨러",
    ],
  },
  {
    name: "배기 시스템",
    parts: ["배기 매니폴드", "촉매 컨버터", "머플러", "산소 센서", "배기관"],
  },
  {
    name: "윤활 시스템",
    parts: ["오일 펌프", "오일 필터", "오일 팬", "오일 쿨러", "오일 라인"],
  },
  {
    name: "제어 시스템",
    parts: ["ECU", "센서 모듈", "액추에이터", "CAN 통신 모듈", "진단 포트"],
  },
];

const SUPPLIERS = [
  "현대위아",
  "대원강업",
  "세원정공",
  "화신",
  "동희오토",
  "평화산업",
  "코렌스",
  "일진다이아",
  "디와이파워",
  "성우하이텍",
];

const MATERIALS = [
  "알루미늄 합금",
  "강철",
  "스테인리스",
  "플라스틱",
  "고무",
  "구리",
  "티타늄",
  "카본",
];
const COLORS = ["은색", "검정", "회색", "파랑", "빨강", "투명", "흰색"];
const COMPONENT_STATUSES: MockComponent["status"][] = [
  "정상",
  "단종",
  "검토중",
  "승인대기",
];

const industries = [
  "IT 서비스",
  "제조",
  "금융",
  "교육",
  "헬스케어",
  "컨설팅",
  "미디어",
];
const departmentNames = [
  "연구개발",
  "영업",
  "인사",
  "재무",
  "고객지원",
  "제품관리",
  "디자인",
  "품질관리",
  "데이터분석",
  "보안",
];
const projectStatuses: MockProject["status"][] = [
  "준비",
  "진행중",
  "보류",
  "완료",
];
const projectVisibilities: MockProject["visibility"][] = [
  "private",
  "internal",
  "public",
];
const userStatuses: MockUserData["status"][] = [
  "활성",
  "초대중",
  "휴면",
  "중지",
];
const jobLevels: MockUserData["jobLevel"][] = [
  "주니어",
  "미들",
  "시니어",
  "리드",
  "디렉터",
];
const timezones = [
  "Asia/Seoul",
  "America/Los_Angeles",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
];
const locales = ["ko-KR", "en-US", "ja-JP", "zh-CN", "de-DE"];
const auditActions = [
  "생성",
  "수정",
  "삭제",
  "권한 변경",
  "로그인 시도",
  "초대 발송",
];
const invitationStatuses: MockInvitation["status"][] = [
  "pending",
  "accepted",
  "expired",
  "revoked",
];

const generateMockPermissions = (): MockPermission[] => {
  const basePermissions: Omit<MockPermission, "id">[] = [
    {
      name: "사용자 보기",
      description: "조직 내 사용자 목록을 조회합니다.",
      category: "user",
    },
    {
      name: "사용자 관리",
      description: "사용자를 생성, 수정, 비활성화할 수 있습니다.",
      category: "user",
    },
    {
      name: "프로젝트 보기",
      description: "프로젝트 세부 정보를 조회합니다.",
      category: "project",
    },
    {
      name: "프로젝트 편집",
      description: "프로젝트 설정과 작업을 수정할 수 있습니다.",
      category: "project",
    },
    {
      name: "조직 설정 관리",
      description: "조직 전반의 설정을 변경할 수 있습니다.",
      category: "organization",
    },
    {
      name: "청구 정보 보기",
      description: "결제 및 청구 정보를 조회합니다.",
      category: "billing",
    },
    {
      name: "보안 설정 관리",
      description: "보안 정책과 접근 제어를 관리합니다.",
      category: "security",
    },
    {
      name: "권한 템플릿 관리",
      description: "역할과 권한 템플릿을 생성하고 수정합니다.",
      category: "security",
    },
  ];

  return basePermissions.map((permission) => ({
    ...permission,
    id: getRandomId("perm_"),
  }));
};

const generateMockRoles = (permissions: MockPermission[]): MockRole[] => {
  const permissionMap = {
    viewUsers: permissions.find((p) => p.name === "사용자 보기")?.id ?? "",
    manageUsers: permissions.find((p) => p.name === "사용자 관리")?.id ?? "",
    viewProjects: permissions.find((p) => p.name === "프로젝트 보기")?.id ?? "",
    editProjects: permissions.find((p) => p.name === "프로젝트 편집")?.id ?? "",
    manageOrg: permissions.find((p) => p.name === "조직 설정 관리")?.id ?? "",
    viewBilling: permissions.find((p) => p.name === "청구 정보 보기")?.id ?? "",
    manageSecurity:
      permissions.find((p) => p.name === "보안 설정 관리")?.id ?? "",
    manageTemplates:
      permissions.find((p) => p.name === "권한 템플릿 관리")?.id ?? "",
  };

  const baseRoles: Array<
    Omit<MockRole, "id" | "permissionIds"> & {
      permissionKeys: (keyof typeof permissionMap)[];
    }
  > = [
    {
      name: "시스템 관리자",
      description: "조직의 모든 설정과 사용자를 관리합니다.",
      scope: "global",
      permissionKeys: [
        "viewUsers",
        "manageUsers",
        "viewProjects",
        "editProjects",
        "manageOrg",
        "viewBilling",
        "manageSecurity",
        "manageTemplates",
      ],
    },
    {
      name: "조직 관리자",
      description: "사용자와 조직 설정을 관리합니다.",
      scope: "global",
      permissionKeys: [
        "viewUsers",
        "manageUsers",
        "viewProjects",
        "editProjects",
        "manageOrg",
      ],
    },
    {
      name: "재무 담당자",
      description: "청구 및 결제 정보를 관리합니다.",
      scope: "global",
      permissionKeys: ["viewUsers", "viewProjects", "viewBilling"],
    },
    {
      name: "보안 관리자",
      description: "보안 정책 및 권한 템플릿을 관리합니다.",
      scope: "global",
      permissionKeys: ["viewUsers", "manageSecurity", "manageTemplates"],
    },
    {
      name: "프로젝트 리드",
      description: "프로젝트 진행 상황과 멤버를 관리합니다.",
      scope: "project",
      permissionKeys: ["viewProjects", "editProjects", "viewUsers"],
    },
    {
      name: "프로젝트 협업자",
      description: "프로젝트 작업에 참여하고 정보를 확인합니다.",
      scope: "project",
      permissionKeys: ["viewProjects", "viewUsers"],
    },
  ];

  return baseRoles.map((role) => ({
    id: getRandomId("role_"),
    name: role.name,
    description: role.description,
    scope: role.scope,
    permissionIds: role.permissionKeys
      .map((key) => permissionMap[key])
      .filter(Boolean),
  }));
};

const generateMockOrganizations = (count: number): MockOrganization[] => {
  return Array.from({ length: count }, (_, index) => {
    const name = `${randomFromArray(companies)} ${index + 1}`;
    const createdAt = getRandomDateWithinYears(5);
    const plans: MockOrganization["plan"][] = ["무료", "프로", "엔터프라이즈"];
    const domain = `org${String(index + 1).padStart(2, "0")}.${randomFromArray([
      "example.com",
      "workspace.kr",
      "teamhub.io",
    ])}`;
    return {
      id: getRandomId("org_"),
      name,
      industry: randomFromArray(industries),
      domain,
      plan: randomFromArray(plans),
      createdAt: formatDate(createdAt),
    };
  });
};

const generateMockDepartments = (
  organizations: MockOrganization[],
  min = 2,
  max = 5
): MockDepartment[] => {
  const departments: MockDepartment[] = [];
  organizations.forEach((org) => {
    const count = randomInt(min, max);
    for (let i = 0; i < count; i++) {
      const deptName = randomFromArray(departmentNames);
      departments.push({
        id: getRandomId("dept_"),
        organizationId: org.id,
        name: deptName,
        description: `${org.name}의 ${deptName} 부서`,
      });
    }
  });
  return departments;
};

const generateMockProjects = (
  organizations: MockOrganization[],
  departments: MockDepartment[],
  count: number
): MockProject[] => {
  const projects: MockProject[] = [];
  for (let i = 0; i < count; i++) {
    const organization = randomFromArray(organizations);
    const deptCandidates = departments.filter(
      (dept) => dept.organizationId === organization.id
    );
    const department = randomFromArray(deptCandidates);
    const startDate = getRandomDateWithinYears(2);
    const endDate = new Date(startDate.getTime());
    endDate.setMonth(endDate.getMonth() + randomInt(1, 12));

    projects.push({
      id: getRandomId("proj_"),
      organizationId: organization.id,
      departmentId: department.id,
      name: `${organization.name} 프로젝트 ${i + 1}`,
      status: randomFromArray(projectStatuses),
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      budget: randomInt(20000, 200000),
      clientName: `${randomFromArray(companies)} 클라이언트`,
      visibility: randomFromArray(projectVisibilities),
    });
  }
  return projects;
};

const getRandomName = (): string => {
  const lastName = randomFromArray(lastNames);
  const firstName = randomFromArray(firstNames);
  return `${lastName}${firstName}`;
};

interface GenerateMockUsersOptions {
  count: number;
  organizations: MockOrganization[];
  departments: MockDepartment[];
  roles: MockRole[];
}

const generateMockUsers = ({
  count,
  organizations,
  departments,
  roles,
}: GenerateMockUsersOptions): MockUserData[] => {
  const globalRoles = roles.filter((role) => role.scope === "global");
  const users: MockUserData[] = [];
  for (let i = 1; i <= count; i++) {
    const organization = randomFromArray(organizations);
    const organizationDepartments = departments.filter(
      (dept) => dept.organizationId === organization.id
    );
    const department =
      organizationDepartments.length > 0
        ? randomFromArray(organizationDepartments)
        : randomFromArray(departments);
    const role = randomFromArray(globalRoles);
    const createdAt = getRandomDateWithinYears(3);
    const lastLogin = new Date(createdAt.getTime());
    lastLogin.setMonth(lastLogin.getMonth() + randomInt(0, 18));

    users.push({
      num: i,
      id: getRandomId("user_"),
      name: getRandomName(),
      email: `datauser${i}@example.com`,
      address: `데이터시 데이터구 데이터로 ${i}번지`,
      phone: `010-${getRandomFourDigits()}-${getRandomFourDigits()}`,
      company: organization.name,
      role: randomFromArray(jobTitles),
      organizationId: organization.id,
      departmentId: department.id,
      roleId: role.id,
      status: randomFromArray(userStatuses),
      jobLevel: randomFromArray(jobLevels),
      timezone: randomFromArray(timezones),
      locale: randomFromArray(locales),
      createdAt: formatDate(createdAt),
      lastLoginAt: formatDate(lastLogin),
      projectMembershipIds: [],
    });
  }
  return users;
};

interface GenerateProjectMembershipsOptions {
  users: MockUserData[];
  projects: MockProject[];
  roles: MockRole[];
}

const generateMockProjectMemberships = ({
  users,
  projects,
  roles,
}: GenerateProjectMembershipsOptions): MockProjectMembership[] => {
  const projectRoles = roles.filter((role) => role.scope === "project");
  const memberships: MockProjectMembership[] = [];
  const userMap = new Map(users.map((user) => [user.id, user]));

  projects.forEach((project) => {
    const sameOrgUsers = users.filter(
      (user) => user.organizationId === project.organizationId
    );
    const candidateUsers = sameOrgUsers.length >= 3 ? sameOrgUsers : users;
    const minMembers =
      candidateUsers.length > 1 ? Math.min(3, candidateUsers.length) : 1;
    const maxMembers = Math.max(
      minMembers,
      Math.min(12, candidateUsers.length)
    );
    const memberCount = randomInt(minMembers, maxMembers);
    const selectedUsers = new Set<MockUserData>();
    while (selectedUsers.size < memberCount) {
      selectedUsers.add(randomFromArray(candidateUsers));
    }

    selectedUsers.forEach((user) => {
      const joinedAt = getRandomDateWithinYears(2);
      const lastActiveAt = new Date(joinedAt.getTime());
      lastActiveAt.setMonth(lastActiveAt.getMonth() + randomInt(0, 12));

      const membership: MockProjectMembership = {
        id: getRandomId("mbr_"),
        projectId: project.id,
        userId: user.id,
        roleId: randomFromArray(projectRoles).id,
        allocation: randomInt(20, 100),
        billable: Math.random() > 0.3,
        joinedAt: formatDate(joinedAt),
        lastActiveAt: formatDate(lastActiveAt),
      };

      memberships.push(membership);
      userMap.get(user.id)?.projectMembershipIds.push(membership.id);
    });
  });

  return memberships;
};

interface GenerateAuditLogsOptions {
  users: MockUserData[];
  projects: MockProject[];
  organizations: MockOrganization[];
}

const generateMockAuditLogs = (
  { users, projects, organizations }: GenerateAuditLogsOptions,
  count = 500
): MockAuditLog[] => {
  const logs: MockAuditLog[] = [];
  for (let i = 0; i < count; i++) {
    const actor = randomFromArray(users);
    const organization =
      organizations.find((org) => org.id === actor.organizationId) ??
      randomFromArray(organizations);
    const entityType = randomFromArray([
      "user",
      "project",
      "organization",
      "department",
      "permission",
      "role",
    ] as const);
    const entityId = (() => {
      switch (entityType) {
        case "user":
          return randomFromArray(users).id;
        case "project":
          return randomFromArray(projects).id;
        case "organization":
          return organization.id;
        case "department":
          return randomFromArray(projects).departmentId;
        case "permission":
          return `perm_ref_${randomInt(100, 999)}`;
        case "role":
          return `role_ref_${randomInt(100, 999)}`;
        default:
          return getRandomId("entity_");
      }
    })();

    const timestamp = getRandomDateWithinYears(1);
    logs.push({
      id: getRandomId("log_"),
      actorUserId: actor.id,
      organizationId: organization.id,
      entityType,
      entityId,
      action: randomFromArray(auditActions),
      description: `${actor.name}님이 ${entityType}에 대해 작업을 수행했습니다.`,
      timestamp: formatDate(timestamp),
      ipAddress: `192.168.${randomInt(0, 255)}.${randomInt(0, 255)}`,
    });
  }
  return logs;
};

interface GenerateInvitationsOptions {
  organizations: MockOrganization[];
  roles: MockRole[];
  users: MockUserData[];
}

const generateMockInvitations = (
  { organizations, roles, users }: GenerateInvitationsOptions,
  count = 200
): MockInvitation[] => {
  const globalRoles = roles.filter((role) => role.scope === "global");
  const invitations: MockInvitation[] = [];
  for (let i = 0; i < count; i++) {
    const organization = randomFromArray(organizations);
    const inviter =
      users.find((user) => user.organizationId === organization.id) ??
      randomFromArray(users);
    const createdAt = getRandomDateWithinYears(1);
    const expiresAt = new Date(createdAt.getTime());
    expiresAt.setDate(expiresAt.getDate() + randomInt(7, 30));

    invitations.push({
      id: getRandomId("invite_"),
      organizationId: organization.id,
      email: `invitee${i}@example.com`,
      roleId: randomFromArray(globalRoles).id,
      inviterUserId: inviter.id,
      status: randomFromArray(invitationStatuses),
      createdAt: formatDate(createdAt),
      expiresAt: formatDate(expiresAt),
    });
  }
  return invitations;
};

const generateMockEngines = (
  projects: MockProject[],
  users: MockUserData[]
): MockEngine[] => {
  const engines: MockEngine[] = [];

  projects.forEach((project) => {
    const engineCount = randomInt(1, 3);

    for (let i = 0; i < engineCount; i++) {
      const engineType = randomFromArray(ENGINE_TYPES);
      const createdAt = new Date(project.startDate);
      const updatedAt = addDays(createdAt, randomInt(1, 100));

      let status: MockEngine["status"];
      if (project.status === "완료") {
        status = Math.random() > 0.3 ? "양산" : "단종";
      } else if (project.status === "진행중") {
        status = randomFromArray(["제작", "테스트", "양산"]);
      } else {
        status = "설계";
      }

      const projectUsers = users.filter(
        (u) =>
          u.projectMembershipIds.length > 0 &&
          u.organizationId === project.organizationId
      );
      const creator =
        projectUsers.length > 0
          ? randomFromArray(projectUsers)
          : randomFromArray(users);

      engines.push({
        id: getRandomId("eng_"),
        projectId: project.id,
        name: `${engineType} ${String.fromCharCode(65 + i)}형`,
        code: `ENG-${randomInt(1000, 9999)}-${String.fromCharCode(65 + i)}`,
        version: `v${randomInt(1, 3)}.${randomInt(0, 9)}.${randomInt(0, 9)}`,
        status,
        manufacturer: randomFromArray(ENGINE_MANUFACTURERS),
        specifications: {
          power: `${randomInt(100, 500)}kW`,
          weight: `${randomInt(50, 300)}kg`,
          dimensions: `${randomInt(400, 800)}x${randomInt(
            300,
            600
          )}x${randomInt(400, 700)}mm`,
        },
        createdAt: formatDate(createdAt),
        updatedAt: formatDate(updatedAt),
        createdBy: creator.id,
      });
    }
  });

  return engines;
};

const generateComponentsRecursive = (
  config: {
    engineId: string;
    parentId: string | null;
    parentName: string;
    level: number;
    orderIndex: number;
    createdAt: Date;
    availableParts: string[];
  },
  depth: number,
  maxDepth: number,
  minChildrenPerNode: number,
  maxChildrenPerNode: number,
  assemblyProbability: number
): MockComponent[] => {
  const components: MockComponent[] = [];
  const {
    engineId,
    parentId,
    parentName,
    level,
    orderIndex,
    createdAt,
    availableParts,
  } = config;

  const shouldBeLeaf = depth >= maxDepth || Math.random() > assemblyProbability;

  if (shouldBeLeaf) {
    const partName =
      availableParts.length > 0
        ? randomFromArray(availableParts)
        : `${parentName} 부품 ${orderIndex + 1}`;

    const part: MockComponent = {
      id: getRandomId("comp_"),
      engineId,
      parentId,
      name: partName,
      code: `PRT-${randomInt(10000, 99999)}`,
      type: "part",
      level,
      orderIndex,
      quantity: randomInt(1, 10),
      unit: randomFromArray(["EA", "SET", "M", "KG", "L"] as const),
      supplier: randomFromArray(SUPPLIERS),
      cost: randomInt(5000, 500000),
      leadTime: randomInt(7, 30),
      status: randomFromArray(COMPONENT_STATUSES),
      specifications: {
        material: randomFromArray(MATERIALS),
        color: randomFromArray(COLORS),
      },
      notes: Math.random() > 0.7 ? "특수 규격 부품" : undefined,
      createdAt: formatDate(createdAt),
      updatedAt: formatDate(addDays(createdAt, randomInt(1, 60))),
    };
    components.push(part);
    return components;
  }

  const assemblyName =
    parentId === null
      ? parentName
      : `${parentName} 서브어셈블리 ${orderIndex + 1}`;

  const assembly: MockComponent = {
    id: getRandomId("comp_"),
    engineId,
    parentId,
    name: assemblyName,
    code:
      level === 0
        ? `ASM-${randomInt(100, 999)}-${orderIndex + 1}`
        : `SUB-${randomInt(100, 999)}-${level}-${orderIndex + 1}`,
    type: "assembly",
    level,
    orderIndex,
    quantity: parentId === null ? 1 : randomInt(1, 2),
    unit: "SET",
    supplier: randomFromArray(SUPPLIERS),
    cost: randomInt(100000, 5000000) * (1 / (level + 1)),
    leadTime: randomInt(20, 90) - level * 5,
    status: randomFromArray(COMPONENT_STATUSES),
    createdAt: formatDate(createdAt),
    updatedAt: formatDate(addDays(createdAt, randomInt(1, 60))),
  };
  components.push(assembly);

  const childCountMultiplier = Math.max(0.3, 1 - depth * 0.15);
  const adjustedMinChildren = Math.max(
    1,
    Math.floor(minChildrenPerNode * childCountMultiplier)
  );
  const adjustedMaxChildren = Math.max(
    adjustedMinChildren,
    Math.floor(maxChildrenPerNode * childCountMultiplier)
  );
  const childCount = randomInt(adjustedMinChildren, adjustedMaxChildren);

  for (let i = 0; i < childCount; i++) {
    const childComponents = generateComponentsRecursive(
      {
        engineId,
        parentId: assembly.id,
        parentName: assemblyName,
        level: level + 1,
        orderIndex: i,
        createdAt,
        availableParts,
      },
      depth + 1,
      maxDepth,
      minChildrenPerNode,
      maxChildrenPerNode,
      assemblyProbability * 0.7
    );
    components.push(...childComponents);
  }

  return components;
};

const generateMockComponents = (
  engines: MockEngine[],
  options: {
    maxDepth?: number;
    minChildrenPerNode?: number;
    maxChildrenPerNode?: number;
    topLevelAssemblies?: number[];
    assemblyProbability?: number;
  } = {}
): MockComponent[] => {
  const {
    maxDepth = 5,
    minChildrenPerNode = 2,
    maxChildrenPerNode = 4,
    topLevelAssemblies = [4, 7],
    assemblyProbability = 0.8,
  } = options;

  const components: MockComponent[] = [];

  engines.forEach((engine) => {
    const createdAt = new Date(engine.createdAt);

    const assemblyCount = randomInt(
      topLevelAssemblies[0],
      topLevelAssemblies[1]
    );
    const selectedAssemblies = [];
    const availableAssemblies = [...COMPONENT_ASSEMBLIES];

    for (let i = 0; i < assemblyCount && availableAssemblies.length > 0; i++) {
      const index = randomInt(0, availableAssemblies.length - 1);
      selectedAssemblies.push(availableAssemblies.splice(index, 1)[0]);
    }

    selectedAssemblies.forEach((assembly, assemblyIndex) => {
      const treeComponents = generateComponentsRecursive(
        {
          engineId: engine.id,
          parentId: null,
          parentName: assembly.name,
          level: 0,
          orderIndex: assemblyIndex,
          createdAt,
          availableParts: assembly.parts,
        },
        0,
        maxDepth,
        minChildrenPerNode,
        maxChildrenPerNode,
        assemblyProbability
      );

      components.push(...treeComponents);
    });
  });

  return components;
};

const hydrateManagers = (
  departments: MockDepartment[],
  organizations: MockOrganization[],
  users: MockUserData[]
): void => {
  const usersByDepartment = new Map<string, MockUserData[]>();
  departments.forEach((department) => {
    usersByDepartment.set(
      department.id,
      users.filter((user) => user.departmentId === department.id)
    );
  });

  departments.forEach((department) => {
    const departmentUsers = usersByDepartment.get(department.id) ?? [];
    department.managerUserId =
      departmentUsers.length > 0
        ? randomFromArray(departmentUsers).id
        : undefined;
  });

  organizations.forEach((organization) => {
    const orgUsers = users.filter(
      (user) => user.organizationId === organization.id
    );
    organization.primaryContactUserId =
      orgUsers.length > 0 ? randomFromArray(orgUsers).id : undefined;
  });
};

const generateCmsMockData = (
  options?: Partial<{
    organizationCount: number;
    projectCount: number;
    userCount: number;
  }>
): CmsMockData => {
  // ✅ 개선: 성능 모니터링
  console.time("⏱️ Mock 데이터 생성");

  const config = {
    organizationCount: 10,
    projectCount: 60,
    userCount: 10000,
    bomMaxDepth: 5,
    bomMinChildrenPerNode: 2,
    bomMaxChildrenPerNode: 4,
    bomTopLevelAssemblies: [4, 7],
    bomAssemblyProbability: 0.8,
    ...options,
  };

  try {
    // ✅ 개선: Try-Catch 에러 처리
    const permissions = generateMockPermissions();
    const roles = generateMockRoles(permissions);
    const organizations = generateMockOrganizations(config.organizationCount);
    const departments = generateMockDepartments(organizations, 3, 6);
    const projects = generateMockProjects(
      organizations,
      departments,
      config.projectCount
    );
    const users = generateMockUsers({
      count: config.userCount,
      organizations,
      departments,
      roles,
    });
    const projectMemberships = generateMockProjectMemberships({
      users,
      projects,
      roles,
    });
    const auditLogs = generateMockAuditLogs({ users, projects, organizations });
    const invitations = generateMockInvitations({
      organizations,
      roles,
      users,
    });
    const engines = generateMockEngines(projects, users);
    const components = generateMockComponents(engines, {
      maxDepth: config.bomMaxDepth,
      minChildrenPerNode: config.bomMinChildrenPerNode,
      maxChildrenPerNode: config.bomMaxChildrenPerNode,
      topLevelAssemblies: config.bomTopLevelAssemblies,
      assemblyProbability: config.bomAssemblyProbability,
    });

    hydrateManagers(departments, organizations, users);

    // ✅ 개선: 성능 모니터링 - 결과 출력
    console.timeEnd("⏱️ Mock 데이터 생성");
    console.log(`📊 생성된 데이터 통계:
  - Organizations: ${organizations.length}
  - Departments: ${departments.length}
  - Projects: ${projects.length}
  - Users: ${users.length}
  - Project Memberships: ${projectMemberships.length}
  - Audit Logs: ${auditLogs.length}
  - Invitations: ${invitations.length}
  - Engines: ${engines.length}
  - Components: ${components.length}
`);

    return {
      permissions,
      roles,
      organizations,
      departments,
      projects,
      users,
      projectMemberships,
      auditLogs,
      invitations,
      engines,
      components,
    };
  } catch (error) {
    // ✅ 개선: 에러 처리
    console.error("❌ Mock 데이터 생성 실패:", error);
    console.timeEnd("⏱️ Mock 데이터 생성");

    // 에러 상세 정보 출력
    if (error instanceof Error) {
      console.error("에러 메시지:", error.message);
      console.error("스택 트레이스:", error.stack);
    }

    throw new Error(`Mock 데이터 생성 중 오류 발생: ${error}`);
  }
};

export const cmsMockData = generateCmsMockData();
export const largeMockData: MockUserData[] = cmsMockData.users;
export const mockOrganizations = cmsMockData.organizations;
export const mockDepartments = cmsMockData.departments;
export const mockProjects = cmsMockData.projects;
export const mockPermissions = cmsMockData.permissions;
export const mockRoles = cmsMockData.roles;
export const mockProjectMemberships = cmsMockData.projectMemberships;
export const mockAuditLogs = cmsMockData.auditLogs;
export const mockInvitations = cmsMockData.invitations;
export const mockEngines = cmsMockData.engines;
export const mockComponents = cmsMockData.components;

// ============================================
// JSONPlaceholder 스타일 Mock Data
// ============================================

export interface MockPost {
  id: number;
  userId: number;
  title: string;
  body: string;
}

export interface MockComment {
  id: number;
  postId: number;
  name: string;
  email: string;
  body: string;
}

export interface MockAlbum {
  id: number;
  userId: number;
  title: string;
}

export interface MockPhoto {
  id: number;
  albumId: number;
  title: string;
  url: string;
  thumbnailUrl: string;
}

export interface MockTodo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

// JSONPlaceholder User 형식 (실제 API와 동일)
export interface MockJsonPlaceholderUser {
  id: number;
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
}

// JSONPlaceholder 스타일 Users 생성 (기존 MockUserData를 변환)
const generateJsonPlaceholderUsers = (): MockJsonPlaceholderUser[] => {
  return largeMockData.slice(0, 100).map((user, index) => ({
    id: index + 1,
    name: user.name,
    username: user.name.replace(/\s+/g, '').toLowerCase() + (index + 1),
    email: user.email,
    address: {
      street: user.address.split(' ')[0] + ' ' + (user.address.split(' ')[1] || ''),
      suite: `Apt. ${randomInt(100, 999)}`,
      city: user.address.includes('시') ? user.address.split(' ')[0] : '서울시',
      zipcode: `${randomInt(10000, 99999)}`,
      geo: {
        lat: (37.5 + Math.random() * 0.5).toFixed(4),
        lng: (126.9 + Math.random() * 0.5).toFixed(4),
      },
    },
    phone: user.phone,
    website: `${user.name.toLowerCase().replace(/\s+/g, '')}.${randomFromArray(['com', 'net', 'org', 'io'])}`,
    company: {
      name: user.company,
      catchPhrase: `${randomFromArray(['혁신적인', '미래지향적인', '고객중심의', '글로벌'])} ${randomFromArray(['솔루션', '서비스', '플랫폼', '기술'])}`,
      bs: `${randomFromArray(['e-commerce', 'cloud computing', 'AI-driven', 'blockchain'])} ${randomFromArray(['solutions', 'platforms', 'services', 'infrastructure'])}`,
    },
  }));
};

// Posts 생성 (100개)
const generateMockPosts = (): MockPost[] => {
  const titles = [
    '새로운 프로젝트 시작',
    '팀 미팅 결과',
    '기술 블로그 포스팅',
    '제품 업데이트 안내',
    '고객 피드백 분석',
    '다음 분기 계획',
    '성과 리뷰',
    '신기술 도입 검토',
  ];
  
  return Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    userId: (i % 10) + 1,
    title: `${randomFromArray(titles)} - ${i + 1}`,
    body: `이것은 ${i + 1}번째 게시글입니다. Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
    Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.`,
  }));
};

// Comments 생성 (500개)
const generateMockComments = (): MockComment[] => {
  const commentPrefixes = [
    '좋은 의견입니다',
    '동의합니다',
    '추가로 제안하자면',
    '흥미로운 관점이네요',
    '잘 읽었습니다',
  ];
  
  return Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    postId: (i % 100) + 1,
    name: `${randomFromArray(commentPrefixes)} - 댓글 ${i + 1}`,
    email: `commenter${i + 1}@example.com`,
    body: `${randomFromArray(commentPrefixes)}. 이것은 ${i + 1}번째 댓글입니다. 
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
  }));
};

// Albums 생성 (100개)
const generateMockAlbums = (): MockAlbum[] => {
  const albumTypes = [
    '여행 사진',
    '프로젝트 기록',
    '팀 이벤트',
    '제품 사진',
    '회사 행사',
  ];
  
  return Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    userId: (i % 10) + 1,
    title: `${randomFromArray(albumTypes)} ${Math.floor(i / 10) + 1}`,
  }));
};

// Photos 생성 (300개)
const generateMockPhotos = (): MockPhoto[] => {
  const colors = ['92c952', '771796', 'd32776', 'f66b97', '24f355', 'e8a838'];
  
  return Array.from({ length: 300 }, (_, i) => ({
    id: i + 1,
    albumId: (i % 100) + 1,
    title: `사진 ${i + 1}`,
    url: `https://via.placeholder.com/600/${randomFromArray(colors)}`,
    thumbnailUrl: `https://via.placeholder.com/150/${randomFromArray(colors)}`,
  }));
};

// Todos 생성 (200개)
const generateMockTodos = (): MockTodo[] => {
  const todoTasks = [
    '문서 작성',
    '코드 리뷰',
    '회의 준비',
    '이메일 답장',
    '보고서 제출',
    '테스트 실행',
    '배포 준비',
  ];
  
  return Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    userId: (i % 10) + 1,
    title: `${randomFromArray(todoTasks)} - ${i + 1}`,
    completed: Math.random() > 0.5,
  }));
};

// Mock 데이터 생성 (함수 호출은 export 후에)
export const mockJsonPlaceholderUsers = generateJsonPlaceholderUsers();
export const mockPosts = generateMockPosts();
export const mockComments = generateMockComments();
export const mockAlbums = generateMockAlbums();
export const mockPhotos = generateMockPhotos();
export const mockTodos = generateMockTodos();

// ============================================
// Utility Functions for Tree Structure
// ============================================

/**
 * 특정 엔진의 모든 컴포넌트를 트리 구조로 변환
 */
export const buildComponentTree = (
  engineId: string,
  components: MockComponent[]
) => {
  type TreeNode = MockComponent & { children: TreeNode[] };

  const engineComponents = components.filter((c) => c.engineId === engineId);
  const map = new Map<string, TreeNode>(
    engineComponents.map((c) => [c.id, { ...c, children: [] }])
  );
  const roots: TreeNode[] = [];

  engineComponents.forEach((component) => {
    const node = map.get(component.id)!;
    if (component.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(component.parentId);
      if (parent) parent.children.push(node);
    }
  });

  const sortChildren = (nodes: TreeNode[]): void => {
    nodes.sort((a, b) => a.orderIndex - b.orderIndex);
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
};

/**
 * 프로젝트의 모든 엔진과 컴포넌트 요약 정보
 */
export const getProjectEnginesSummary = (
  projectId: string,
  engines: MockEngine[],
  components: MockComponent[]
) => {
  const projectEngines = engines.filter((e) => e.projectId === projectId);

  return projectEngines.map((engine) => {
    const engineComponents = components.filter((c) => c.engineId === engine.id);
    const assemblies = engineComponents.filter(
      (c) => c.type === "assembly" && c.level === 0
    );
    const totalParts = engineComponents.filter((c) => c.type === "part");
    const totalCost = engineComponents.reduce(
      (sum, c) => sum + c.cost * c.quantity,
      0
    );
    const maxDepth = Math.max(...engineComponents.map((c) => c.level), 0);

    return {
      engine,
      assembliesCount: assemblies.length,
      totalPartsCount: totalParts.length,
      totalComponentsCount: engineComponents.length,
      estimatedTotalCost: totalCost,
      maxTreeDepth: maxDepth + 1,
    };
  });
};

/**
 * 컴포넌트 트리의 최대 깊이 계산
 */
export const getComponentTreeDepth = (
  engineId: string,
  components: MockComponent[]
): number => {
  const engineComponents = components.filter((c) => c.engineId === engineId);
  if (engineComponents.length === 0) return 0;
  return Math.max(...engineComponents.map((c) => c.level)) + 1;
};

/**
 * 특정 레벨의 모든 컴포넌트 가져오기
 */
export const getComponentsByLevel = (
  engineId: string,
  level: number,
  components: MockComponent[]
): MockComponent[] => {
  return components.filter((c) => c.engineId === engineId && c.level === level);
};

/**
 * 컴포넌트의 전체 경로 가져오기 (루트부터 해당 컴포넌트까지)
 */
export const getComponentPath = (
  componentId: string,
  components: MockComponent[]
): MockComponent[] => {
  const component = components.find((c) => c.id === componentId);
  if (!component) return [];

  const path: MockComponent[] = [component];
  let current = component;

  while (current.parentId) {
    const parent = components.find((c) => c.id === current.parentId);
    if (!parent) break;
    path.unshift(parent);
    current = parent;
  }

  return path;
};

/**
 * 컴포넌트의 모든 자식 (재귀적으로) 가져오기
 */
export const getComponentDescendants = (
  componentId: string,
  components: MockComponent[]
): MockComponent[] => {
  const descendants: MockComponent[] = [];
  const children = components.filter((c) => c.parentId === componentId);

  children.forEach((child) => {
    descendants.push(child);
    descendants.push(...getComponentDescendants(child.id, components));
  });

  return descendants;
};
