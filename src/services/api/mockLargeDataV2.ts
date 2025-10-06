export interface MockPermission {
    id: string;
    name: string;
    description: string;
    category: 'user' | 'project' | 'organization' | 'security' | 'billing';
}

export interface MockRole {
    id: string;
    name: string;
    description: string;
    scope: 'global' | 'project';
    permissionIds: string[];
}

export interface MockOrganization {
    id: string;
    name: string;
    industry: string;
    domain: string;
    plan: '무료' | '프로' | '엔터프라이즈';
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
    status: '준비' | '진행중' | '보류' | '완료';
    startDate: string;
    endDate: string;
    budget: number;
    clientName: string;
    visibility: 'private' | 'internal' | 'public';
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
    entityType: 'user' | 'project' | 'organization' | 'department' | 'permission' | 'role';
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
    status: 'pending' | 'accepted' | 'expired' | 'revoked';
    expiresAt: string;
    createdAt: string;
}

export interface EngineSpecifications {
    power?: string;
    weight?: string;
    dimensions?: string;
    [key: string]: string | undefined;
}

export interface MockEngine {
    id: string;
    projectId: string;
    name: string;
    code: string;
    version: string;
    status: '설계' | '제작' | '테스트' | '양산' | '단종';
    manufacturer: string;
    specifications: EngineSpecifications;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

export interface ComponentSpecifications {
    material?: string;
    color?: string;
    [key: string]: string | undefined;
}

export interface MockComponent {
    id: string;
    engineId: string;
    parentId: string | null;
    name: string;
    code: string;
    type: 'assembly' | 'part';
    level: number;
    orderIndex: number;
    quantity: number;
    unit: 'EA' | 'SET' | 'M' | 'KG' | 'L';
    supplier: string;
    cost: number;
    leadTime: number;
    status: '정상' | '단종' | '검토중' | '승인대기';
    specifications?: ComponentSpecifications;
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
    status: '활성' | '초대중' | '휴면' | '중지';
    jobLevel: '주니어' | '미들' | '시니어' | '리드' | '디렉터';
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

export interface ComponentTreeNode extends MockComponent {
    children: ComponentTreeNode[];
}

export interface ProjectEngineSummary {
    engine: MockEngine;
    assembliesCount: number;
    totalPartsCount: number;
    totalComponentsCount: number;
    estimatedTotalCost: number;
}

const REAL_KOREAN_COMPANIES = [
    { name: '삼성전자', industry: 'IT 서비스', domain: 'samsung.com' },
    { name: 'LG전자', industry: '제조', domain: 'lge.com' },
    { name: '현대자동차', industry: '제조', domain: 'hyundai.com' },
    { name: '네이버', industry: 'IT 서비스', domain: 'naver.com' },
    { name: '카카오', industry: 'IT 서비스', domain: 'kakao.com' },
    { name: 'SK하이닉스', industry: '제조', domain: 'skhynix.com' },
    { name: '한국전력공사', industry: '에너지', domain: 'kepco.co.kr' },
    { name: '우리은행', industry: '금융', domain: 'wooribank.com' },
    { name: 'KB국민은행', industry: '금융', domain: 'kbstar.com' },
    { name: '신한은행', industry: '금융', domain: 'shinhan.com' },
    { name: 'KT', industry: 'IT 서비스', domain: 'kt.com' },
    { name: 'SKT', industry: 'IT 서비스', domain: 'sktelecom.com' },
    { name: '포스코', industry: '제조', domain: 'posco.com' },
    { name: 'CJ제일제당', industry: '제조', domain: 'cj.net' },
    { name: '롯데쇼핑', industry: '유통', domain: 'lotte.co.kr' },
];

const STARTUP_PREFIXES = ['비즈니스', '스마트', '디지털', '클라우드', '데이터', '퓨처', '넥스트'];
const STARTUP_SUFFIXES = ['테크', '랩스', '스튜디오', '이노베이션', '솔루션즈', '시스템즈', '플랫폼', '웍스'];

const PROJECT_TYPES = [
    '모바일 앱 리뉴얼',
    '웹사이트 구축',
    'AI 챗봇 도입',
    '빅데이터 분석 플랫폼',
    'ERP 시스템 업그레이드',
    'CRM 시스템 통합',
    '클라우드 인프라 마이그레이션',
    'API 게이트웨이 구축',
    '보안 강화 프로젝트',
    '레거시 시스템 현대화',
    'e커머스 플랫폼 개발',
    'IoT 플랫폼 구축',
    '결제 시스템 개선',
    '재고관리 시스템',
    'HR 관리 시스템',
];

const CLIENT_COMPANIES = [
    '삼성',
    'LG',
    '현대',
    '기아',
    'SK',
    '롯데',
    'CJ',
    '한화',
    '신세계',
    'GS',
    '포스코',
    'KT',
    '네이버',
    '카카오',
    'NC소프트',
    '넷마블',
    '쿠팡',
    '배달의민족',
    '당근마켓',
    '토스',
];

const JOB_TITLES_BY_DEPT: Record<string, string[]> = {
    개발: ['프론트엔드 개발자', '백엔드 개발자', '풀스택 개발자', 'DevOps 엔지니어', '소프트웨어 엔지니어'],
    디자인: ['UI/UX 디자이너', '프로덕트 디자이너', '그래픽 디자이너', '브랜드 디자이너'],
    기획: ['서비스 기획자', '프로덕트 오너', '프로덕트 매니저', 'BM 기획자'],
    데이터: ['데이터 분석가', '데이터 엔지니어', 'ML 엔지니어', '데이터 사이언티스트'],
    영업: ['영업 매니저', '세일즈 담당자', '어카운트 매니저', '비즈니스 개발자'],
    마케팅: ['퍼포먼스 마케터', '콘텐츠 마케터', '브랜드 마케터', 'CRM 마케터'],
    인사: ['HR 매니저', '채용 담당자', '인사 기획자', 'HR 파트너'],
    재무: ['재무 담당자', '회계 담당자', '재무 분석가', '경영 기획자'],
    경영지원: ['총무 담당자', '사업 지원 매니저', '경영지원 스페셜리스트'],
    품질관리: ['품질 엔지니어', 'QA 매니저', '품질 분석가'],
};

const DEPARTMENTS = ['개발', '디자인', '기획', '데이터', '영업', '마케팅', '인사', '재무', '경영지원', '품질관리'];

const KOREAN_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
const KOREAN_FIRST_NAMES = [
    '민준', '서준', '예준', '도윤', '시우', '주원', '하준', '지호', '준서', '건우',
    '서연', '서윤', '지우', '서현', '민서', '하은', '수빈', '지민', '지유', '채원',
    '현우', '승우', '지훈', '준영', '민재', '은우', '유준', '정우', '승현', '시윤',
    '다은', '예은', '소율', '윤서', '채은', '지원', '수아', '시은', '연우', '지안',
    '수현', '예진', '민지', '유진', '은지', '가은', '나연', '다현', '채영', '정민',
];

const SEOUL_DISTRICTS = [
    '강남구',
    '강동구',
    '강북구',
    '강서구',
    '관악구',
    '광진구',
    '구로구',
    '금천구',
    '노원구',
    '도봉구',
    '동대문구',
    '동작구',
    '마포구',
    '서대문구',
    '서초구',
    '성동구',
    '성북구',
    '송파구',
    '양천구',
    '영등포구',
    '용산구',
    '은평구',
    '종로구',
    '중구',
    '중랑구',
];

const ENGINE_TYPES = ['전기 모터', '가솔린 엔진', '디젤 엔진', '하이브리드 엔진', '터보 엔진', '수소 연료전지', '로터리 엔진', 'V6 엔진', 'V8 엔진', '직렬 4기통'];
const ENGINE_MANUFACTURERS = ['현대모비스', 'LG전자', '삼성SDI', '만도', '한온시스템', 'LS일렉트릭', '효성중공업', 'Bosch', 'Continental', 'Denso'];

const COMPONENT_ASSEMBLIES = [
    { name: '동력 전달 시스템', parts: ['변속기', '클러치', '드라이브 샤프트', '차동 장치', '휠 허브'] },
    { name: '냉각 시스템', parts: ['라디에이터', '워터 펌프', '쿨링 팬', '서모스탯', '냉각수 호스'] },
    { name: '연료 시스템', parts: ['연료 펌프', '인젝터', '연료 필터', '연료 탱크', '연료 라인'] },
    { name: '전기 시스템', parts: ['배터리', '알터네이터', '스타터 모터', '점화 코일', '배선 하네스'] },
    { name: '흡기 시스템', parts: ['에어 필터', '흡기 매니폴드', '스로틀 바디', '터보차저', '인터쿨러'] },
    { name: '배기 시스템', parts: ['배기 매니폴드', '촉매 컨버터', '머플러', '산소 센서', '배기관'] },
    { name: '윤활 시스템', parts: ['오일 펌프', '오일 필터', '오일 팬', '오일 쿨러', '오일 라인'] },
    { name: '제어 시스템', parts: ['ECU', '센서 모듈', '액추에이터', 'CAN 통신 모듈', '진단 포트'] },
];

const SUPPLIERS = ['현대위아', '대원강업', '세원정공', '화신', '동희오토', '평화산업', '코렌스', '일진다이아', '디와이파워', '성우하이텍'];
const MATERIALS = ['알루미늄 합금', '강철', '스테인리스', '플라스틱', '고무', '구리', '티타늄', '카본'];
const COLORS = ['은색', '검정', '회색', '파랑', '빨강', '투명', '흰색'];
const COMPONENT_STATUSES: MockComponent['status'][] = ['정상', '단종', '검토중', '승인대기'];
const AUDIT_ACTIONS = ['생성', '수정', '삭제', '권한 변경', '로그인 시도', '초대 발송'];
const INVITATION_STATUSES: MockInvitation['status'][] = ['pending', 'accepted', 'expired', 'revoked'];

const randomFromArray = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const randomInt = (min: number, max: number): number => {
    const lower = Math.ceil(min);
    const upper = Math.floor(max);
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
};

const weightedRandom = <T>(items: readonly T[], weights: readonly number[]): T => {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const threshold = Math.random() * totalWeight;
    let cumulative = 0;
    for (let i = 0; i < items.length; i += 1) {
        cumulative += weights[i];
        if (threshold <= cumulative) {
            return items[i];
        }
    }
    return items[items.length - 1];
};

const getRandomFourDigits = (): string => String(Math.floor(Math.random() * 10000)).padStart(4, '0');

const getRandomId = (prefix = ''): string => {
    const length = randomInt(8, 16);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    for (let i = prefix.length; i < length; i += 1) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const getRandomDateWithinYears = (yearsBack: number): Date => {
    const now = Date.now();
    const past = new Date();
    past.setFullYear(new Date().getFullYear() - yearsBack);
    const min = past.getTime();
    return new Date(min + Math.random() * (now - min));
};

const addMonths = (date: Date, months: number): Date => {
    const result = new Date(date.getTime());
    result.setMonth(result.getMonth() + months);
    return result;
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
};

const formatDate = (date: Date): string => date.toISOString();

const getKoreanName = (): string => `${randomFromArray(KOREAN_LAST_NAMES)}${randomFromArray(KOREAN_FIRST_NAMES)}`;

const sanitizeDomain = (value: string): string => {
    const sanitized = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '');
    return sanitized.length > 0 ? sanitized : 'example';
};

const getRealisticEmail = (num: number, domain: string): string => {
    const sanitizedDomain = domain.includes('.') ? domain : `${sanitizeDomain(domain)}.com`;
    return `user${num}@${sanitizedDomain}`;
};

const getSeoulAddress = (): string => {
    const district = randomFromArray(SEOUL_DISTRICTS);
    const street = randomInt(1, 100);
    const building = randomInt(1, 50);
    return `서울특별시 ${district} ${street}로 ${building}`;
};

const generateMockPermissions = (): MockPermission[] => {
    const basePermissions: Omit<MockPermission, 'id'>[] = [
        { name: '사용자 조회', description: '조직 내 사용자 목록과 상세 정보를 확인합니다.', category: 'user' },
        { name: '사용자 관리', description: '사용자 생성, 수정, 비활성화 권한이 있습니다.', category: 'user' },
        { name: '프로젝트 조회', description: '프로젝트 목록과 상세 정보를 확인합니다.', category: 'project' },
        { name: '프로젝트 편집', description: '프로젝트 정보와 설정을 수정합니다.', category: 'project' },
        { name: '프로젝트 생성', description: '새로운 프로젝트를 생성합니다.', category: 'project' },
        { name: '프로젝트 삭제', description: '프로젝트를 삭제합니다.', category: 'project' },
        { name: '조직 설정 관리', description: '조직 전체 설정을 변경합니다.', category: 'organization' },
        { name: '부서 관리', description: '부서를 생성하고 관리합니다.', category: 'organization' },
        { name: '청구 정보 조회', description: '결제 내역과 청구서를 확인합니다.', category: 'billing' },
        { name: '청구 정보 관리', description: '결제 수단과 플랜을 변경합니다.', category: 'billing' },
        { name: '보안 정책 관리', description: '보안 설정과 접근 제어를 관리합니다.', category: 'security' },
        { name: '권한 관리', description: '역할과 권한을 생성하고 할당합니다.', category: 'security' },
    ];

    return basePermissions.map(permission => ({
        ...permission,
        id: getRandomId('perm_'),
    }));
};

const generateMockRoles = (permissions: MockPermission[]): MockRole[] => {
    const findPermission = (name: string) => permissions.find(permission => permission.name === name)?.id ?? '';

    const globalRoles: Omit<MockRole, 'id' | 'permissionIds'> & { permissionNames: string[] }[] = [
        {
            name: '최고 관리자',
            description: '모든 권한을 가진 시스템 관리자입니다.',
            scope: 'global',
            permissionNames: permissions.map(permission => permission.name),
        },
        {
            name: '조직 관리자',
            description: '조직과 사용자를 관리합니다.',
            scope: 'global',
            permissionNames: ['사용자 조회', '사용자 관리', '프로젝트 조회', '프로젝트 편집', '조직 설정 관리', '부서 관리'],
        },
        {
            name: '재무 담당자',
            description: '결제와 청구를 관리합니다.',
            scope: 'global',
            permissionNames: ['사용자 조회', '프로젝트 조회', '청구 정보 조회', '청구 정보 관리'],
        },
    ];

    const projectRoles: Omit<MockRole, 'id' | 'permissionIds'> & { permissionNames: string[] }[] = [
        {
            name: '프로젝트 매니저',
            description: '프로젝트를 생성하고 관리합니다.',
            scope: 'project',
            permissionNames: ['사용자 조회', '프로젝트 조회', '프로젝트 편집', '프로젝트 생성'],
        },
        {
            name: '팀 멤버',
            description: '프로젝트에 참여하고 작업합니다.',
            scope: 'project',
            permissionNames: ['사용자 조회', '프로젝트 조회'],
        },
        {
            name: '뷰어',
            description: '정보를 조회만 할 수 있습니다.',
            scope: 'project',
            permissionNames: ['프로젝트 조회'],
        },
    ];

    const roleDefinitions = [...globalRoles, ...projectRoles];

    return roleDefinitions.map(role => ({
        id: getRandomId('role_'),
        name: role.name,
        description: role.description,
        scope: role.scope,
        permissionIds: role.permissionNames.map(findPermission).filter(Boolean),
    }));
};

const generateMockOrganizations = (count: number): MockOrganization[] => {
    const organizations: MockOrganization[] = [];
    const plans: MockOrganization['plan'][] = ['무료', '프로', '엔터프라이즈'];
    const planWeights = [0.5, 0.35, 0.15];

    const realCompanyCount = Math.min(count, REAL_KOREAN_COMPANIES.length);
    REAL_KOREAN_COMPANIES.slice(0, realCompanyCount).forEach(company => {
        const createdAt = getRandomDateWithinYears(7);
        organizations.push({
            id: getRandomId('org_'),
            name: company.name,
            industry: company.industry,
            domain: company.domain,
            plan: '엔터프라이즈',
            createdAt: formatDate(createdAt),
        });
    });

    const remaining = count - realCompanyCount;
    for (let i = 0; i < remaining; i += 1) {
        const prefix = randomFromArray(STARTUP_PREFIXES);
        const suffix = randomFromArray(STARTUP_SUFFIXES);
        const name = `${prefix}${suffix}`;
        const plan = weightedRandom(plans, planWeights);
        const createdAt = getRandomDateWithinYears(plan === '엔터프라이즈' ? 5 : 3);
        const slug = sanitizeDomain(name);

        organizations.push({
            id: getRandomId('org_'),
            name,
            industry: randomFromArray(['IT 서비스', '컨설팅', '교육', '미디어']),
            domain: `${slug}.io`,
            plan,
            createdAt: formatDate(createdAt),
        });
    }

    return organizations;
};

const generateMockDepartments = (organizations: MockOrganization[]): MockDepartment[] => {
    const departments: MockDepartment[] = [];
    organizations.forEach(org => {
        const deptRange =
            org.plan === '엔터프라이즈'
                ? { min: 5, max: 8 }
                : org.plan === '프로'
                ? { min: 3, max: 5 }
                : { min: 2, max: 3 };
        const deptCount = Math.min(randomInt(deptRange.min, deptRange.max), DEPARTMENTS.length);
        const selected = new Set<string>();
        while (selected.size < deptCount) {
            selected.add(randomFromArray(DEPARTMENTS));
        }

        selected.forEach(deptName => {
            departments.push({
                id: getRandomId('dept_'),
                organizationId: org.id,
                name: deptName,
                description: `${org.name}의 ${deptName}팀입니다.`,
            });
        });
    });
    return departments;
};

const generateProjectDates = (status: MockProject['status']): { startDate: Date; endDate: Date } => {
    const now = new Date();
    switch (status) {
        case '준비': {
            const prepStart = addDays(now, randomInt(7, 90));
            const prepEnd = addMonths(prepStart, randomInt(2, 6));
            return { startDate: prepStart, endDate: prepEnd };
        }
        case '진행중': {
            const ongoingStart = addMonths(now, -randomInt(1, 8));
            const ongoingEnd = addMonths(now, randomInt(1, 6));
            return { startDate: ongoingStart, endDate: ongoingEnd };
        }
        case '보류': {
            const pausedStart = addMonths(now, -randomInt(2, 12));
            const pausedEnd = addMonths(now, randomInt(2, 8));
            return { startDate: pausedStart, endDate: pausedEnd };
        }
        case '완료':
        default: {
            const completedEnd = addMonths(now, -randomInt(1, 24));
            const completedStart = addMonths(completedEnd, -randomInt(2, 12));
            return { startDate: completedStart, endDate: completedEnd };
        }
    }
};

const getBudgetRange = (plan: MockOrganization['plan']): { min: number; max: number } => {
    switch (plan) {
        case '무료':
            return { min: 5000, max: 30000 };
        case '프로':
            return { min: 30000, max: 150000 };
        case '엔터프라이즈':
        default:
            return { min: 100000, max: 800000 };
    }
};

const getProjectVisibility = (): MockProject['visibility'] => {
    const rand = Math.random();
    if (rand < 0.65) return 'internal';
    if (rand < 0.9) return 'private';
    return 'public';
};

const generateMockProjects = (
    organizations: MockOrganization[],
    departments: MockDepartment[],
    count: number
): MockProject[] => {
    const projects: MockProject[] = [];
    const statuses: MockProject['status'][] = ['준비', '진행중', '보류', '완료'];
    const statusWeights = [0.15, 0.5, 0.1, 0.25];

    for (let i = 0; i < count; i += 1) {
        const organization = randomFromArray(organizations);
        const orgDepartments = departments.filter(dept => dept.organizationId === organization.id);
        const department = orgDepartments.length > 0 ? randomFromArray(orgDepartments) : randomFromArray(departments);
        if (!department) {
            continue;
        }

        const status = weightedRandom(statuses, statusWeights);
        const { startDate, endDate } = generateProjectDates(status);
        const budgetRange = getBudgetRange(organization.plan);
        const projectType = randomFromArray(PROJECT_TYPES);
        const clientCompany = randomFromArray(CLIENT_COMPANIES);

        projects.push({
            id: getRandomId('proj_'),
            organizationId: organization.id,
            departmentId: department.id,
            name: `${projectType} (${clientCompany})`,
            status,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            budget: randomInt(budgetRange.min, budgetRange.max),
            clientName: clientCompany,
            visibility: getProjectVisibility(),
        });
    }

    return projects;
};

const generateMockUsers = (
    count: number,
    organizations: MockOrganization[],
    departments: MockDepartment[],
    roles: MockRole[]
): MockUserData[] => {
    const users: MockUserData[] = [];
    const globalRoles = roles.filter(role => role.scope === 'global');
    const statusOptions: MockUserData['status'][] = ['활성', '초대중', '휴면', '중지'];
    const statusWeights = [0.75, 0.1, 0.1, 0.05];
    const jobLevels: MockUserData['jobLevel'][] = ['주니어', '미들', '시니어', '리드', '디렉터'];
    const jobLevelWeights = [0.35, 0.3, 0.2, 0.1, 0.05];

    for (let i = 1; i <= count; i += 1) {
        const organization = randomFromArray(organizations);
        const orgDepartments = departments.filter(dept => dept.organizationId === organization.id);
        const department = orgDepartments.length > 0 ? randomFromArray(orgDepartments) : randomFromArray(departments);
        const role = globalRoles.length > 0 ? randomFromArray(globalRoles) : randomFromArray(roles);
        const status = weightedRandom(statusOptions, statusWeights);
        const jobLevel = weightedRandom(jobLevels, jobLevelWeights);
        const createdAtDate = getRandomDateWithinYears(organization.plan === '엔터프라이즈' ? 5 : 3);
        const lastLoginDate = status === '활성' ? addDays(new Date(), -randomInt(0, 7)) : createdAtDate;
        const name = getKoreanName();
        const departmentName = department?.name ?? '개발';
        const deptJobTitles = JOB_TITLES_BY_DEPT[departmentName] ?? JOB_TITLES_BY_DEPT['개발'];
        const jobTitle = randomFromArray(deptJobTitles);

        users.push({
            num: i,
            id: getRandomId('user_'),
            name,
            email: getRealisticEmail(i, organization.domain),
            address: getSeoulAddress(),
            phone: `010-${getRandomFourDigits()}-${getRandomFourDigits()}`,
            company: organization.name,
            role: jobTitle,
            organizationId: organization.id,
            departmentId: department?.id ?? '',
            roleId: role.id,
            status,
            jobLevel,
            timezone: 'Asia/Seoul',
            locale: 'ko-KR',
            createdAt: formatDate(createdAtDate),
            lastLoginAt: formatDate(lastLoginDate),
            projectMembershipIds: [],
        });
    }

    return users;
};

const generateMockProjectMemberships = (
    users: MockUserData[],
    projects: MockProject[],
    roles: MockRole[]
): MockProjectMembership[] => {
    const memberships: MockProjectMembership[] = [];
    const projectRoles = roles.filter(role => role.scope === 'project');
    const defaultProjectRole = projectRoles[0] ?? roles[0];
    const userMap = new Map(users.map(user => [user.id, user]));
    const usersByOrg = new Map<string, MockUserData[]>();

    users.forEach(user => {
        if (!usersByOrg.has(user.organizationId)) {
            usersByOrg.set(user.organizationId, []);
        }
        usersByOrg.get(user.organizationId)!.push(user);
    });

    projects.forEach(project => {
        const orgUsers = usersByOrg.get(project.organizationId) ?? [];
        if (orgUsers.length === 0) {
            return;
        }

        const memberCount =
            project.status === '완료'
                ? randomInt(3, Math.min(6, orgUsers.length))
                : project.status === '진행중'
                ? randomInt(5, Math.min(12, orgUsers.length))
                : project.status === '보류'
                ? randomInt(2, Math.min(5, orgUsers.length))
                : randomInt(2, Math.min(4, orgUsers.length));

        const selectedUsers = new Set<MockUserData>();
        while (selectedUsers.size < memberCount) {
            selectedUsers.add(randomFromArray(orgUsers));
            if (selectedUsers.size === orgUsers.length) {
                break;
            }
        }

        const pmRole = projectRoles.find(role => role.name === '프로젝트 매니저');
        const memberRole = projectRoles.find(role => role.name === '팀 멤버');
        const projectStart = new Date(project.startDate);
        const projectEnd = new Date(project.endDate);

        Array.from(selectedUsers).forEach((user, index) => {
            const isManager = index === 0;
            const assignedRole = isManager && pmRole ? pmRole : memberRole ?? defaultProjectRole;
            const joinedAtBase = Number.isNaN(projectStart.getTime()) ? new Date() : projectStart;
            const joinedAtDate = project.status === '준비' ? addDays(joinedAtBase, -randomInt(0, 15)) : addDays(joinedAtBase, -randomInt(0, 30));
            const now = new Date();
            let lastActiveDate: Date;
            if (project.status === '진행중') {
                lastActiveDate = addDays(now, -randomInt(0, 5));
            } else if (project.status === '완료' && !Number.isNaN(projectEnd.getTime())) {
                lastActiveDate = projectEnd;
            } else if (project.status === '보류' && !Number.isNaN(projectEnd.getTime())) {
                lastActiveDate = addDays(projectEnd, -randomInt(15, 45));
            } else {
                lastActiveDate = joinedAtDate;
            }

            const allocation = isManager
                ? randomInt(70, 100)
                : user.jobLevel === '주니어'
                ? randomInt(60, 100)
                : user.jobLevel === '디렉터'
                ? randomInt(20, 50)
                : randomInt(40, 80);

            const membership: MockProjectMembership = {
                id: getRandomId('mbr_'),
                projectId: project.id,
                userId: user.id,
                roleId: assignedRole.id,
                allocation,
                billable: Math.random() > 0.3,
                joinedAt: formatDate(joinedAtDate),
                lastActiveAt: formatDate(lastActiveDate),
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
    for (let i = 0; i < count; i += 1) {
        const actor = randomFromArray(users);
        const organization = organizations.find(org => org.id === actor.organizationId) ?? randomFromArray(organizations);
        const entityType = randomFromArray([
            'user',
            'project',
            'organization',
            'department',
            'permission',
            'role',
        ] as const);
        const randomProject = projects.length > 0 ? randomFromArray(projects) : undefined;
        const entityId = (() => {
            switch (entityType) {
                case 'user':
                    return randomFromArray(users).id;
                case 'project':
                    return randomProject?.id ?? getRandomId('proj_ref_');
                case 'organization':
                    return organization.id;
                case 'department':
                    return randomProject?.departmentId ?? getRandomId('dept_ref_');
                case 'permission':
                    return `perm_ref_${randomInt(100, 999)}`;
                case 'role':
                    return `role_ref_${randomInt(100, 999)}`;
                default:
                    return getRandomId('entity_');
            }
        })();

        const timestamp = getRandomDateWithinYears(1);
        logs.push({
            id: getRandomId('log_'),
            actorUserId: actor.id,
            organizationId: organization.id,
            entityType,
            entityId,
            action: randomFromArray(AUDIT_ACTIONS),
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
    const globalRoles = roles.filter(role => role.scope === 'global');
    const fallbackRole = roles[0];
    const invitations: MockInvitation[] = [];
    for (let i = 0; i < count; i += 1) {
        const organization = randomFromArray(organizations);
        const inviter = users.find(user => user.organizationId === organization.id) ?? randomFromArray(users);
        const createdAt = getRandomDateWithinYears(1);
        const expiresAt = addDays(createdAt, randomInt(7, 30));

        invitations.push({
            id: getRandomId('invite_'),
            organizationId: organization.id,
            email: `invitee${i}@example.com`,
            roleId: (globalRoles.length > 0 ? randomFromArray(globalRoles) : fallbackRole).id,
            inviterUserId: inviter.id,
            status: randomFromArray(INVITATION_STATUSES),
            createdAt: formatDate(createdAt),
            expiresAt: formatDate(expiresAt),
        });
    }
    return invitations;
};

const generateMockEngines = (
    projects: MockProject[],
    users: MockUserData[],
    projectMemberships: MockProjectMembership[]
): MockEngine[] => {
    const engines: MockEngine[] = [];
    const engineStatuses: MockEngine['status'][] = ['설계', '제작', '테스트', '양산', '단종'];
    const membershipsByProject = new Map<string, MockProjectMembership[]>();
    projectMemberships.forEach(membership => {
        if (!membershipsByProject.has(membership.projectId)) {
            membershipsByProject.set(membership.projectId, []);
        }
        membershipsByProject.get(membership.projectId)!.push(membership);
    });

    projects.forEach(project => {
        const engineCount = randomInt(1, 3);
        const projectMembership = membershipsByProject.get(project.id) ?? [];
        const memberUserIds = new Set(projectMembership.map(membership => membership.userId));
        const projectUsers = users.filter(user => memberUserIds.has(user.id));
        const organizationUsers = users.filter(user => user.organizationId === project.organizationId);

        for (let i = 0; i < engineCount; i += 1) {
            const engineType = randomFromArray(ENGINE_TYPES);
            const projectStart = new Date(project.startDate);
            const createdAt = Number.isNaN(projectStart.getTime()) ? getRandomDateWithinYears(2) : projectStart;
            const updatedAt = addDays(createdAt, randomInt(1, 100));

            let status: MockEngine['status'];
            if (project.status === '완료') {
                status = Math.random() > 0.3 ? '양산' : '단종';
            } else if (project.status === '진행중') {
                status = randomFromArray(['제작', '테스트', '양산'] as const);
            } else if (project.status === '보류') {
                status = '설계';
            } else {
                status = randomFromArray(engineStatuses);
            }

            const creatorPool = projectUsers.length > 0 ? projectUsers : organizationUsers;
            const creator = creatorPool.length > 0 ? randomFromArray(creatorPool) : randomFromArray(users);

            engines.push({
                id: getRandomId('eng_'),
                projectId: project.id,
                name: `${engineType} ${String.fromCharCode(65 + i)}형`,
                code: `ENG-${randomInt(1000, 9999)}-${String.fromCharCode(65 + i)}`,
                version: `v${randomInt(1, 3)}.${randomInt(0, 9)}.${randomInt(0, 9)}`,
                status,
                manufacturer: randomFromArray(ENGINE_MANUFACTURERS),
                specifications: {
                    power: `${randomInt(100, 500)}kW`,
                    weight: `${randomInt(50, 300)}kg`,
                    dimensions: `${randomInt(400, 800)}x${randomInt(300, 600)}x${randomInt(400, 700)}mm`,
                },
                createdAt: formatDate(createdAt),
                updatedAt: formatDate(updatedAt),
                createdBy: creator.id,
            });
        }
    });

    return engines;
};

const generateMockComponents = (engines: MockEngine[]): MockComponent[] => {
    const components: MockComponent[] = [];

    engines.forEach(engine => {
        const createdAt = new Date(engine.createdAt);
        const assemblyCount = randomInt(4, Math.min(7, COMPONENT_ASSEMBLIES.length));
        const availableAssemblies = [...COMPONENT_ASSEMBLIES];
        const selectedAssemblies: typeof COMPONENT_ASSEMBLIES[number][] = [];

        for (let i = 0; i < assemblyCount && availableAssemblies.length > 0; i += 1) {
            const index = randomInt(0, availableAssemblies.length - 1);
            selectedAssemblies.push(availableAssemblies.splice(index, 1)[0]);
        }

        selectedAssemblies.forEach((assembly, assemblyIndex) => {
            const assemblyComponent: MockComponent = {
                id: getRandomId('comp_'),
                engineId: engine.id,
                parentId: null,
                name: assembly.name,
                code: `ASM-${randomInt(100, 999)}-${assemblyIndex + 1}`,
                type: 'assembly',
                level: 0,
                orderIndex: assemblyIndex,
                quantity: 1,
                unit: 'SET',
                supplier: randomFromArray(SUPPLIERS),
                cost: randomInt(500000, 5000000),
                leadTime: randomInt(30, 90),
                status: randomFromArray(COMPONENT_STATUSES),
                createdAt: formatDate(createdAt),
                updatedAt: formatDate(addDays(createdAt, randomInt(1, 60))),
            };
            components.push(assemblyComponent);

            const hasSubAssembly = Math.random() > 0.5;
            if (hasSubAssembly) {
                const subAssemblyCount = randomInt(2, 4);
                for (let subIdx = 0; subIdx < subAssemblyCount; subIdx += 1) {
                    const subAssembly: MockComponent = {
                        id: getRandomId('comp_'),
                        engineId: engine.id,
                        parentId: assemblyComponent.id,
                        name: `${assembly.name} 서브유닛 ${subIdx + 1}`,
                        code: `SUB-${randomInt(100, 999)}-${subIdx + 1}`,
                        type: 'assembly',
                        level: 1,
                        orderIndex: subIdx,
                        quantity: randomInt(1, 2),
                        unit: 'SET',
                        supplier: randomFromArray(SUPPLIERS),
                        cost: randomInt(100000, 1000000),
                        leadTime: randomInt(20, 60),
                        status: randomFromArray(COMPONENT_STATUSES),
                        createdAt: formatDate(createdAt),
                        updatedAt: formatDate(addDays(createdAt, randomInt(1, 60))),
                    };
                    components.push(subAssembly);

                    const partsForThisSub = randomInt(2, 4);
                    for (let partIdx = 0; partIdx < partsForThisSub; partIdx += 1) {
                        const partName = assembly.parts[partIdx];
                        if (!partName) {
                            continue;
                        }

                        const part: MockComponent = {
                            id: getRandomId('comp_'),
                            engineId: engine.id,
                            parentId: subAssembly.id,
                            name: partName,
                            code: `PRT-${randomInt(10000, 99999)}`,
                            type: 'part',
                            level: 2,
                            orderIndex: partIdx,
                            quantity: randomInt(1, 10),
                            unit: randomFromArray(['EA', 'SET', 'M', 'KG'] as const),
                            supplier: randomFromArray(SUPPLIERS),
                            cost: randomInt(5000, 500000),
                            leadTime: randomInt(7, 30),
                            status: randomFromArray(COMPONENT_STATUSES),
                            specifications: {
                                material: randomFromArray(MATERIALS),
                                color: randomFromArray(COLORS),
                            },
                            notes: Math.random() > 0.7 ? '특수 규격 부품' : undefined,
                            createdAt: formatDate(createdAt),
                            updatedAt: formatDate(addDays(createdAt, randomInt(1, 60))),
                        };
                        components.push(part);
                    }
                }
            } else {
                assembly.parts.forEach((partName, partIdx) => {
                    const part: MockComponent = {
                        id: getRandomId('comp_'),
                        engineId: engine.id,
                        parentId: assemblyComponent.id,
                        name: partName,
                        code: `PRT-${randomInt(10000, 99999)}`,
                        type: 'part',
                        level: 1,
                        orderIndex: partIdx,
                        quantity: randomInt(1, 10),
                        unit: randomFromArray(['EA', 'SET', 'M', 'KG'] as const),
                        supplier: randomFromArray(SUPPLIERS),
                        cost: randomInt(5000, 500000),
                        leadTime: randomInt(7, 30),
                        status: randomFromArray(COMPONENT_STATUSES),
                        specifications: {
                            material: randomFromArray(MATERIALS),
                            color: randomFromArray(COLORS),
                        },
                        notes: Math.random() > 0.7 ? '특수 규격 부품' : undefined,
                        createdAt: formatDate(createdAt),
                        updatedAt: formatDate(addDays(createdAt, randomInt(1, 60))),
                    };
                    components.push(part);
                });
            }
        });
    });

    return components;
};

const hydrateManagers = (departments: MockDepartment[], organizations: MockOrganization[], users: MockUserData[]): void => {
    const usersByDepartment = new Map<string, MockUserData[]>();
    departments.forEach(department => {
        usersByDepartment.set(
            department.id,
            users.filter(user => user.departmentId === department.id)
        );
    });

    departments.forEach(department => {
        const departmentUsers = usersByDepartment.get(department.id) ?? [];
        department.managerUserId = departmentUsers.length > 0 ? randomFromArray(departmentUsers).id : undefined;
    });

    organizations.forEach(organization => {
        const orgUsers = users.filter(user => user.organizationId === organization.id);
        organization.primaryContactUserId = orgUsers.length > 0 ? randomFromArray(orgUsers).id : undefined;
    });
};

const generateCmsMockData = (options?: Partial<{ organizationCount: number; projectCount: number; userCount: number }>): CmsMockData => {
    const config = {
        organizationCount: 10,
        projectCount: 60,
        userCount: 10000,
        ...options,
    };

    const permissions = generateMockPermissions();
    const roles = generateMockRoles(permissions);
    const organizations = generateMockOrganizations(config.organizationCount);
    const departments = generateMockDepartments(organizations);
    const projects = generateMockProjects(organizations, departments, config.projectCount);
    const users = generateMockUsers(config.userCount, organizations, departments, roles);
    const projectMemberships = generateMockProjectMemberships(users, projects, roles);
    const auditLogs = generateMockAuditLogs({ users, projects, organizations });
    const invitations = generateMockInvitations({ organizations, roles, users });
    const engines = generateMockEngines(projects, users, projectMemberships);
    const components = generateMockComponents(engines);

    hydrateManagers(departments, organizations, users);

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

export const buildComponentTree = (engineId: string, components: MockComponent[]): ComponentTreeNode[] => {
    const engineComponents = components.filter(component => component.engineId === engineId);
    const map = new Map<string, ComponentTreeNode>(
        engineComponents.map(component => [component.id, { ...component, children: [] as ComponentTreeNode[] }])
    );
    const roots: ComponentTreeNode[] = [];

    engineComponents.forEach(component => {
        const node = map.get(component.id);
        if (!node) {
            return;
        }
        if (component.parentId === null) {
            roots.push(node);
        } else {
            const parent = map.get(component.parentId);
            if (parent) {
                parent.children.push(node);
            }
        }
    });

    const sortChildren = (nodes: ComponentTreeNode[]): void => {
        nodes.sort((a, b) => a.orderIndex - b.orderIndex);
        nodes.forEach(node => {
            if (node.children.length > 0) {
                sortChildren(node.children);
            }
        });
    };

    sortChildren(roots);
    return roots;
};

export const getProjectEnginesSummary = (
    projectId: string,
    engines: MockEngine[],
    components: MockComponent[]
): ProjectEngineSummary[] => {
    const projectEngines = engines.filter(engine => engine.projectId === projectId);

    return projectEngines.map(engine => {
        const engineComponents = components.filter(component => component.engineId === engine.id);
        const assemblies = engineComponents.filter(component => component.type === 'assembly' && component.level === 0);
        const totalParts = engineComponents.filter(component => component.type === 'part');
        const totalCost = engineComponents.reduce((sum, component) => sum + component.cost * component.quantity, 0);

        return {
            engine,
            assembliesCount: assemblies.length,
            totalPartsCount: totalParts.length,
            totalComponentsCount: engineComponents.length,
            estimatedTotalCost: totalCost,
        };
    });
};

