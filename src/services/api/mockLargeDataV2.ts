
export interface MockUserData {
    num: number;
    id: string;
    name: string;
    email: string;
    address: string;
    phone: string;
    company: string;
    role: string;
}

// 랜덤 4자리 숫자 생성 함수
const getRandomFourDigits = (): string => {
    return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
};

// 회사 이름 목록
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

// 직무 목록
const roles = [
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

// 성(姓) 목록
const lastNames = [
    '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
    '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍',
];

// 이름 목록 (2글자)
const firstNames = [
    '민준', '서준', '예준', '도윤', '시우', '주원', '하준', '지호', '준서', '건우',
    '서연', '서윤', '지우', '서현', '민서', '하은', '수빈', '지민', '지유', '채원',
    '현우', '승우', '지훈', '준영', '민재', '은우', '유준', '정우', '승현', '시윤',
    '다은', '예은', '소율', '윤서', '채은', '지원', '수아', '시은', '연우', '지안',
];

// 랜덤 회사 선택 함수
const getRandomCompany = (): string => {
    return companies[Math.floor(Math.random() * companies.length)];
};

// 랜덤 직무 선택 함수
const getRandomRole = (): string => {
    return roles[Math.floor(Math.random() * roles.length)];
};

// 랜덤 이름 생성 함수
const getRandomName = (): string => {
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    return `${lastName}${firstName}`;
};

// 4~12자리 랜덤 ID 생성 함수
const getRandomId = (): string => {
    const length = Math.floor(Math.random() * 9) + 4; // 4~12 사이의 랜덤 길이
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const generateMockUsers = (count: number): MockUserData[] => {
    const users: MockUserData[] = [];
    for (let i = 1; i <= count; i++) {
        users.push({
            num: i,
            id: getRandomId(),
            name: getRandomName(),
            email: `datauser${i}@example.com`,
            address: `데이터시 데이터구 데이터로 ${i}번지`,
            phone: `010-${getRandomFourDigits()}-${getRandomFourDigits()}`,
            company: getRandomCompany(),
            role: getRandomRole(),
        });
    }
    return users;
};

export const largeMockData: MockUserData[] = generateMockUsers(5000);
