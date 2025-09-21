import type { Meta, StoryObj } from '@storybook/react';
import { Table, TableHeader, TableBody, Column, Row, Cell } from '../builder/components/Table';

interface Person {
    id: string;
    name: string;
    role: string;
    status: string;
}

const columns = [
    { id: 'name', name: '이름' },
    { id: 'role', name: '역할' },
    { id: 'status', name: '상태' }
] as const;

const rows: Person[] = [
    { id: '1', name: '홍길동', role: '디자이너', status: '활성' },
    { id: '2', name: '김철수', role: '개발자', status: '자리비움' },
    { id: '3', name: '이영희', role: '제품 매니저', status: '오프라인' }
];

const meta: Meta<typeof Table> = {
    title: 'Builder/Components/Table',
    component: Table,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'React Aria 기반의 접근 가능한 테이블 컴포넌트입니다. 다양한 변형과 크기를 지원합니다.',
            },
        },
    },
    argTypes: {
        variant: {
            control: 'radio',
            options: ['default', 'bordered', 'striped'],
            description: '테이블의 시각적 스타일 변형',
        },
        size: {
            control: 'radio',
            options: ['sm', 'md', 'lg'],
            description: '테이블의 크기',
        },
        headerVariant: {
            control: 'radio',
            options: ['default', 'dark', 'primary'],
            description: '헤더의 시각적 스타일',
        },
        cellVariant: {
            control: 'radio',
            options: ['default', 'striped'],
            description: '셀의 시각적 스타일',
        },
    },
};

export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = {
    args: {
        children: (
            <>
                <TableHeader>
                    <Column isRowHeader>이름</Column>
                    <Column>나이</Column>
                    <Column>이메일</Column>
                </TableHeader>
                <TableBody>
                    <Row>
                        <Cell>홍길동</Cell>
                        <Cell>25</Cell>
                        <Cell>hong@example.com</Cell>
                    </Row>
                </TableBody>
            </>
        ),
        variant: 'default',
        size: 'md',
        headerVariant: 'default',
        cellVariant: 'default',
    },
};

export const Bordered: Story = {
    args: {
        children: (
            <>
                <TableHeader>
                    <Column isRowHeader>제품명</Column>
                    <Column>가격</Column>
                    <Column>재고</Column>
                </TableHeader>
                <TableBody>
                    <Row>
                        <Cell>노트북</Cell>
                        <Cell>1,200,000원</Cell>
                        <Cell>15개</Cell>
                    </Row>
                </TableBody>
            </>
        ),
        variant: 'bordered',
        size: 'md',
        headerVariant: 'default',
        cellVariant: 'default',
    },
};

export const Striped: Story = {
    args: {
        children: (
            <>
                <TableHeader>
                    <Column isRowHeader>학생명</Column>
                    <Column>점수</Column>
                    <Column>등급</Column>
                </TableHeader>
                <TableBody>
                    <Row>
                        <Cell>김철수</Cell>
                        <Cell>95</Cell>
                        <Cell>A+</Cell>
                    </Row>
                </TableBody>
            </>
        ),
        variant: 'striped',
        size: 'md',
        headerVariant: 'default',
        cellVariant: 'striped',
    },
};

export const DarkHeader: Story = {
    args: {
        children: (
            <>
                <TableHeader>
                    <Column isRowHeader>사원명</Column>
                    <Column>부서</Column>
                    <Column>직급</Column>
                </TableHeader>
                <TableBody>
                    <Row>
                        <Cell>이영희</Cell>
                        <Cell>개발팀</Cell>
                        <Cell>시니어</Cell>
                    </Row>
                </TableBody>
            </>
        ),
        variant: 'bordered',
        size: 'md',
        headerVariant: 'dark',
        cellVariant: 'default',
    },
};

export const PrimaryHeader: Story = {
    args: {
        children: (
            <>
                <TableHeader>
                    <Column isRowHeader>주문번호</Column>
                    <Column>고객명</Column>
                    <Column>주문일</Column>
                </TableHeader>
                <TableBody>
                    <Row>
                        <Cell>#12345</Cell>
                        <Cell>박민수</Cell>
                        <Cell>2024-01-15</Cell>
                    </Row>
                </TableBody>
            </>
        ),
        variant: 'bordered',
        size: 'md',
        headerVariant: 'primary',
        cellVariant: 'default',
    },
};

export const SmallSize: Story = {
    args: {
        children: (
            <>
                <TableHeader>
                    <Column isRowHeader>ID</Column>
                    <Column>상태</Column>
                    <Column>액션</Column>
                </TableHeader>
                <TableBody>
                    <Row>
                        <Cell>001</Cell>
                        <Cell>활성</Cell>
                        <Cell>편집</Cell>
                    </Row>
                </TableBody>
            </>
        ),
        variant: 'bordered',
        size: 'sm',
        headerVariant: 'default',
        cellVariant: 'default',
    },
};

export const LargeSize: Story = {
    args: {
        children: (
            <>
                <TableHeader>
                    <Column isRowHeader>프로젝트명</Column>
                    <Column>진행률</Column>
                    <Column>마감일</Column>
                </TableHeader>
                <TableBody>
                    <Row>
                        <Cell>웹사이트 리뉴얼</Cell>
                        <Cell>75%</Cell>
                        <Cell>2024-03-15</Cell>
                    </Row>
                </TableBody>
            </>
        ),
        variant: 'bordered',
        size: 'lg',
        headerVariant: 'default',
        cellVariant: 'default',
    },
};

export const AllVariants: Story = {
    render: () => (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold mb-4">Default Table</h3>
                <Table variant="default" size="md">
                    <TableHeader>
                        <Column isRowHeader>이름</Column>
                        <Column>나이</Column>
                    </TableHeader>
                    <TableBody>
                        <Row>
                            <Cell>홍길동</Cell>
                            <Cell>25</Cell>
                        </Row>
                    </TableBody>
                </Table>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4">Bordered Table</h3>
                <Table variant="bordered" size="md">
                    <TableHeader>
                        <Column isRowHeader>제품</Column>
                        <Column>가격</Column>
                    </TableHeader>
                    <TableBody>
                        <Row>
                            <Cell>노트북</Cell>
                            <Cell>1,200,000원</Cell>
                        </Row>
                    </TableBody>
                </Table>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4">Striped Table</h3>
                <Table variant="striped" size="md">
                    <TableHeader>
                        <Column isRowHeader>학생</Column>
                        <Column>점수</Column>
                    </TableHeader>
                    <TableBody>
                        <Row>
                            <Cell>김철수</Cell>
                            <Cell>95</Cell>
                        </Row>
                    </TableBody>
                </Table>
            </div>
        </div>
    ),
};