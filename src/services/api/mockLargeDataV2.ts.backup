
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
}

// Utility helpers
const randomFromArray = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const randomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomFourDigits = (): string => {
    return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
};

const getRandomId = (prefix = ''): string => {
    const length = randomInt(8, 16);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
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

const companies = [
    '테크노베이션',
    '디지털솔루션',
    '스마트시스템즈',
    '퓨처테크',
    '이노베이션랩',
    '클라우드웍스',
    '데이터인사이트',
    '넥스트제너레이션',
    '글로벌소프트',
    '크리에이티브스튜디오',
    '인텔리전스그룹',
    '비즈니스파트너스',
    '엔터프라이즈솔루션',
    '스마트플랫폼',
    '디지털이노베이션',
];

const jobTitles = [
    '프론트엔드 개발자',
    '백엔드 개발자',
    '풀스택 개발자',
    '데이터 엔지니어',
    '데이터 분석가',
    'DevOps 엔지니어',
    'UI/UX 디자이너',
    '프로젝트 매니저',
    '제품 관리자',
    'QA 엔지니어',
    '시스템 아키텍트',
    '보안 전문가',
    '마케팅 매니저',
    '영업 전문가',
    '인사 담당자',
];

const lastNames = [
    '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
    '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍',
];

const firstNames = [
    '민준', '서준', '예준', '도윤', '시우', '주원', '하준', '지호', '준서', '건우',
    '서연', '서윤', '지우', '서현', '민서', '하은', '수빈', '지민', '지유', '채원',
    '현우', '승우', '지훈', '준영', '민재', '은우', '유준', '정우', '승현', '시윤',
    '다은', '예은', '소율', '윤서', '채은', '지원', '수아', '시은', '연우', '지안',
];

const industries = ['IT 서비스', '제조', '금융', '교육', '헬스케어', '컨설팅', '미디어'];
const departmentNames = ['연구개발', '영업', '인사', '재무', '고객지원', '제품관리', '디자인', '품질관리', '데이터분석', '보안'];
const projectStatuses: MockProject['status'][] = ['준비', '진행중', '보류', '완료'];
const projectVisibilities: MockProject['visibility'][] = ['private', 'internal', 'public'];
const userStatuses: MockUserData['status'][] = ['활성', '초대중', '휴면', '중지'];
const jobLevels: MockUserData['jobLevel'][] = ['주니어', '미들', '시니어', '리드', '디렉터'];
const timezones = ['Asia/Seoul', 'America/Los_Angeles', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore'];
const locales = ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'de-DE'];
const auditActions = ['생성', '수정', '삭제', '권한 변경', '로그인 시도', '초대 발송'];
const invitationStatuses: MockInvitation['status'][] = ['pending', 'accepted', 'expired', 'revoked'];

const generateMockPermissions = (): MockPermission[] => {
    const basePermissions: Omit<MockPermission, 'id'>[] = [
        { name: '사용자 보기', description: '조직 내 사용자 목록을 조회합니다.', category: 'user' },
        { name: '사용자 관리', description: '사용자를 생성, 수정, 비활성화할 수 있습니다.', category: 'user' },
        { name: '프로젝트 보기', description: '프로젝트 세부 정보를 조회합니다.', category: 'project' },
        { name: '프로젝트 편집', description: '프로젝트 설정과 작업을 수정할 수 있습니다.', category: 'project' },
        { name: '조직 설정 관리', description: '조직 전반의 설정을 변경할 수 있습니다.', category: 'organization' },
        { name: '청구 정보 보기', description: '결제 및 청구 정보를 조회합니다.', category: 'billing' },
        { name: '보안 설정 관리', description: '보안 정책과 접근 제어를 관리합니다.', category: 'security' },
        { name: '권한 템플릿 관리', description: '역할과 권한 템플릿을 생성하고 수정합니다.', category: 'security' },
    ];

    return basePermissions.map(permission => ({
        ...permission,
        id: getRandomId('perm_'),
    }));
};

const generateMockRoles = (permissions: MockPermission[]): MockRole[] => {
    const permissionMap = {
        viewUsers: permissions.find(p => p.name === '사용자 보기')?.id ?? '',
        manageUsers: permissions.find(p => p.name === '사용자 관리')?.id ?? '',
        viewProjects: permissions.find(p => p.name === '프로젝트 보기')?.id ?? '',
        editProjects: permissions.find(p => p.name === '프로젝트 편집')?.id ?? '',
        manageOrg: permissions.find(p => p.name === '조직 설정 관리')?.id ?? '',
        viewBilling: permissions.find(p => p.name === '청구 정보 보기')?.id ?? '',
        manageSecurity: permissions.find(p => p.name === '보안 설정 관리')?.id ?? '',
        manageTemplates: permissions.find(p => p.name === '권한 템플릿 관리')?.id ?? '',
    };

    const baseRoles: Array<Omit<MockRole, 'id' | 'permissionIds'> & { permissionKeys: (keyof typeof permissionMap)[] }> = [
        {
            name: '시스템 관리자',
            description: '조직의 모든 설정과 사용자를 관리합니다.',
            scope: 'global',
            permissionKeys: ['viewUsers', 'manageUsers', 'viewProjects', 'editProjects', 'manageOrg', 'viewBilling', 'manageSecurity', 'manageTemplates'],
        },
        {
            name: '조직 관리자',
            description: '사용자와 조직 설정을 관리합니다.',
            scope: 'global',
            permissionKeys: ['viewUsers', 'manageUsers', 'viewProjects', 'editProjects', 'manageOrg'],
        },
        {
            name: '재무 담당자',
            description: '청구 및 결제 정보를 관리합니다.',
            scope: 'global',
            permissionKeys: ['viewUsers', 'viewProjects', 'viewBilling'],
        },
        {
            name: '보안 관리자',
            description: '보안 정책 및 권한 템플릿을 관리합니다.',
            scope: 'global',
            permissionKeys: ['viewUsers', 'manageSecurity', 'manageTemplates'],
        },
        {
            name: '프로젝트 리드',
            description: '프로젝트 진행 상황과 멤버를 관리합니다.',
            scope: 'project',
            permissionKeys: ['viewProjects', 'editProjects', 'viewUsers'],
        },
        {
            name: '프로젝트 협업자',
            description: '프로젝트 작업에 참여하고 정보를 확인합니다.',
            scope: 'project',
            permissionKeys: ['viewProjects', 'viewUsers'],
        },
    ];

    return baseRoles.map(role => ({
        id: getRandomId('role_'),
        name: role.name,
        description: role.description,
        scope: role.scope,
        permissionIds: role.permissionKeys.map(key => permissionMap[key]).filter(Boolean),
    }));
};

const generateMockOrganizations = (count: number): MockOrganization[] => {
    return Array.from({ length: count }, (_, index) => {
        const name = `${randomFromArray(companies)} ${index + 1}`;
        const createdAt = getRandomDateWithinYears(5);
        const plans: MockOrganization['plan'][] = ['무료', '프로', '엔터프라이즈'];
        const domain = `org${String(index + 1).padStart(2, '0')}.${randomFromArray(['example.com', 'workspace.kr', 'teamhub.io'])}`;
        return {
            id: getRandomId('org_'),
            name,
            industry: randomFromArray(industries),
            domain,
            plan: randomFromArray(plans),
            createdAt: formatDate(createdAt),
        };
    });
};

const generateMockDepartments = (organizations: MockOrganization[], min = 2, max = 5): MockDepartment[] => {
    const departments: MockDepartment[] = [];
    organizations.forEach(org => {
        const count = randomInt(min, max);
        for (let i = 0; i < count; i++) {
            const deptName = randomFromArray(departmentNames);
            departments.push({
                id: getRandomId('dept_'),
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
        const deptCandidates = departments.filter(dept => dept.organizationId === organization.id);
        const department = randomFromArray(deptCandidates);
        const startDate = getRandomDateWithinYears(2);
        const endDate = new Date(startDate.getTime());
        endDate.setMonth(endDate.getMonth() + randomInt(1, 12));

        projects.push({
            id: getRandomId('proj_'),
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

const generateMockUsers = ({ count, organizations, departments, roles }: GenerateMockUsersOptions): MockUserData[] => {
    const globalRoles = roles.filter(role => role.scope === 'global');
    const users: MockUserData[] = [];
    for (let i = 1; i <= count; i++) {
        const organization = randomFromArray(organizations);
        const organizationDepartments = departments.filter(dept => dept.organizationId === organization.id);
        const department = organizationDepartments.length > 0 ? randomFromArray(organizationDepartments) : randomFromArray(departments);
        const role = randomFromArray(globalRoles);
        const createdAt = getRandomDateWithinYears(3);
        const lastLogin = new Date(createdAt.getTime());
        lastLogin.setMonth(lastLogin.getMonth() + randomInt(0, 18));

        users.push({
            num: i,
            id: getRandomId('user_'),
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

const generateMockProjectMemberships = ({ users, projects, roles }: GenerateProjectMembershipsOptions): MockProjectMembership[] => {
    const projectRoles = roles.filter(role => role.scope === 'project');
    const memberships: MockProjectMembership[] = [];
    const userMap = new Map(users.map(user => [user.id, user]));

    projects.forEach(project => {
        const sameOrgUsers = users.filter(user => user.organizationId === project.organizationId);
        const candidateUsers = sameOrgUsers.length >= 3 ? sameOrgUsers : users;
        const minMembers = candidateUsers.length > 1 ? Math.min(3, candidateUsers.length) : 1;
        const maxMembers = Math.max(minMembers, Math.min(12, candidateUsers.length));
        const memberCount = randomInt(minMembers, maxMembers);
        const selectedUsers = new Set<MockUserData>();
        while (selectedUsers.size < memberCount) {
            selectedUsers.add(randomFromArray(candidateUsers));
        }

        selectedUsers.forEach(user => {
            const joinedAt = getRandomDateWithinYears(2);
            const lastActiveAt = new Date(joinedAt.getTime());
            lastActiveAt.setMonth(lastActiveAt.getMonth() + randomInt(0, 12));

            const membership: MockProjectMembership = {
                id: getRandomId('mbr_'),
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

const generateMockAuditLogs = ({ users, projects, organizations }: GenerateAuditLogsOptions, count = 500): MockAuditLog[] => {
    const logs: MockAuditLog[] = [];
    for (let i = 0; i < count; i++) {
        const actor = randomFromArray(users);
        const organization = organizations.find(org => org.id === actor.organizationId) ?? randomFromArray(organizations);
        const entityType = randomFromArray(['user', 'project', 'organization', 'department', 'permission', 'role'] as const);
        const entityId = (() => {
            switch (entityType) {
                case 'user':
                    return randomFromArray(users).id;
                case 'project':
                    return randomFromArray(projects).id;
                case 'organization':
                    return organization.id;
                case 'department':
                    return randomFromArray(projects).departmentId;
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

const generateMockInvitations = ({ organizations, roles, users }: GenerateInvitationsOptions, count = 200): MockInvitation[] => {
    const globalRoles = roles.filter(role => role.scope === 'global');
    const invitations: MockInvitation[] = [];
    for (let i = 0; i < count; i++) {
        const organization = randomFromArray(organizations);
        const inviter = users.find(user => user.organizationId === organization.id) ?? randomFromArray(users);
        const createdAt = getRandomDateWithinYears(1);
        const expiresAt = new Date(createdAt.getTime());
        expiresAt.setDate(expiresAt.getDate() + randomInt(7, 30));

        invitations.push({
            id: getRandomId('invite_'),
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
    const departments = generateMockDepartments(organizations, 3, 6);
    const projects = generateMockProjects(organizations, departments, config.projectCount);
    const users = generateMockUsers({
        count: config.userCount,
        organizations,
        departments,
        roles,
    });
    const projectMemberships = generateMockProjectMemberships({ users, projects, roles });
    const auditLogs = generateMockAuditLogs({ users, projects, organizations });
    const invitations = generateMockInvitations({ organizations, roles, users });

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
