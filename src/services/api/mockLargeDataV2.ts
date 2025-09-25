
export interface MockUserData {
    id: string;
    name: string;
    email: string;
    address: string;
    phone: string;
    jobTitle: string;
}

export const generateMockUsers = (count: number): MockUserData[] => {
    const users: MockUserData[] = [];
    for (let i = 1; i <= count; i++) {
        users.push({
            id: `data-${i}`,
            name: `데이터 사용자 ${i}`,
            email: `datauser${i}@example.com`,
            address: `데이터시 데이터구 데이터로 ${i}번지`,
            phone: `010-5555-${String(i).padStart(4, '0')}`,
            jobTitle: `데이터 전문가 ${i % 5}`,
        });
    }
    return users;
};

export const largeMockData: MockUserData[] = generateMockUsers(500);
