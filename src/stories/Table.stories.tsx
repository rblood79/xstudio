import type { Meta, StoryObj } from '@storybook/react';
import { Table, TableHeader, TableBody, Column, Row, Cell } from '../builder/components/Table';

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
        children: {
            control: 'text',
            description: '테이블 내부에 렌더링될 TableHeader 및 TableBody 컴포넌트',
        },
        variant: {
            control: 'radio',
            options: ['default', 'bordered', 'striped', 'static'],
            description: '테이블의 시각적 스타일 변형 (기본, 테두리, 줄무늬, 정적)',
        },
        size: {
            control: 'radio',
            options: ['sm', 'md', 'lg'],
            description: '테이블의 크기 (작게, 중간, 크게)',
        },
        headerVariant: {
            control: 'radio',
            options: ['default', 'dark', 'primary'],
            description: '테이블 헤더의 시각적 스타일 (기본, 어둡게, 강조)',
        },
        cellVariant: {
            control: 'radio',
            options: ['default', 'striped'],
            description: '테이블 셀의 시각적 스타일 (기본, 줄무늬)',
        },
        'aria-label': {
            control: 'text',
            description: '테이블에 대한 접근성 레이블 (필수)',
        },
        selectionMode: {
            control: 'radio',
            options: ['none', 'single', 'multiple'],
            description: '테이블 행 선택 모드',
        },
        selectedKeys: {
            control: 'array',
            description: '선택된 행의 키 배열 (제어용)',
        },
        disabledKeys: {
            control: 'array',
            description: '비활성화된 행의 키 배열',
        },
        onRowAction: { action: 'onRowAction', description: '행이 활성화될 때 호출되는 콜백' },
        onSelectionChange: { action: 'onSelectionChange', description: '선택된 행이 변경될 때 호출되는 콜백' },
    },
    args: {
        variant: 'default',
        size: 'md',
        headerVariant: 'default',
        cellVariant: 'default',
        'aria-label': '사용자 정보 테이블',
        selectionMode: 'none',
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
                    <Row>
                        <Cell>김영희</Cell>
                        <Cell>30</Cell>
                        <Cell>kim@example.com</Cell>
                    </Row>
                </TableBody>
            </>
        ),
    },
};

export default meta;
type Story = StoryObj<typeof Table>;

export const DefaultTable: Story = {};

export const BorderedTable: Story = {
    args: {
        variant: 'bordered',
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
    },
};

export const StripedTable: Story = {
    args: {
        variant: 'striped',
        cellVariant: 'striped',
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
                    <Row>
                        <Cell>박영희</Cell>
                        <Cell>88</Cell>
                        <Cell>B+</Cell>
                    </Row>
                </TableBody>
            </>
        ),
    },
};

export const DarkHeaderTable: Story = {
    args: {
        headerVariant: 'dark',
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
    },
};

export const PrimaryHeaderTable: Story = {
    args: {
        headerVariant: 'primary',
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
    },
};

export const SmallSizeTable: Story = {
    args: {
        size: 'sm',
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
    },
};

export const LargeSizeTable: Story = {
    args: {
        size: 'lg',
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
    },
};

export const AllTableVariants: Story = {
    render: () => (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold mb-4">기본 테이블</h3>
                <Table variant="default" size="md" aria-label="기본 테이블 예시">
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
                <h3 className="text-lg font-semibold mb-4">테두리 테이블</h3>
                <Table variant="bordered" size="md" aria-label="테두리 테이블 예시">
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
                <h3 className="text-lg font-semibold mb-4">줄무늬 테이블</h3>
                <Table variant="striped" size="md" aria-label="줄무늬 테이블 예시">
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