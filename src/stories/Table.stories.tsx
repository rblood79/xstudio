import type { Meta, StoryObj } from '@storybook/react';
import { Table, TableHeaderComponent, TableBodyComponent, TableColumn, TableRow, TableCell } from '../builder/components/Table';

const meta: Meta<typeof Table> = {
    title: 'Builder/Components/Table',
    component: Table,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'React Aria 기반의 접근 가능한 테이블 컴포넌트입니다. tHead와 tBody를 기본적으로 생성하며, 반복되는 데이터는 1줄만 기본 제공합니다.',
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
                <TableHeaderComponent>
                    <TableRow>
                        <TableCell>이름</TableCell>
                        <TableCell>나이</TableCell>
                        <TableCell>이메일</TableCell>
                    </TableRow>
                </TableHeaderComponent>
                <TableBodyComponent>
                    <TableRow>
                        <TableCell>홍길동</TableCell>
                        <TableCell>25</TableCell>
                        <TableCell>hong@example.com</TableCell>
                    </TableRow>
                </TableBodyComponent>
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
                <TableHeaderComponent>
                    <TableRow>
                        <TableCell>제품명</TableCell>
                        <TableCell>가격</TableCell>
                        <TableCell>재고</TableCell>
                    </TableRow>
                </TableHeaderComponent>
                <TableBodyComponent>
                    <TableRow>
                        <TableCell>노트북</TableCell>
                        <TableCell>1,200,000원</TableCell>
                        <TableCell>15개</TableCell>
                    </TableRow>
                </TableBodyComponent>
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
                <TableHeaderComponent>
                    <TableRow>
                        <TableCell>학생명</TableCell>
                        <TableCell>점수</TableCell>
                        <TableCell>등급</TableCell>
                    </TableRow>
                </TableHeaderComponent>
                <TableBodyComponent variant="striped">
                    <TableRow>
                        <TableCell>김철수</TableCell>
                        <TableCell>95</TableCell>
                        <TableCell>A+</TableCell>
                    </TableRow>
                </TableBodyComponent>
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
                <TableHeaderComponent variant="dark">
                    <TableRow>
                        <TableCell>사원명</TableCell>
                        <TableCell>부서</TableCell>
                        <TableCell>직급</TableCell>
                    </TableRow>
                </TableHeaderComponent>
                <TableBodyComponent>
                    <TableRow>
                        <TableCell>이영희</TableCell>
                        <TableCell>개발팀</TableCell>
                        <TableCell>시니어</TableCell>
                    </TableRow>
                </TableBodyComponent>
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
                <TableHeaderComponent variant="primary">
                    <TableRow>
                        <TableCell>주문번호</TableCell>
                        <TableCell>고객명</TableCell>
                        <TableCell>주문일</TableCell>
                    </TableRow>
                </TableHeaderComponent>
                <TableBodyComponent>
                    <TableRow>
                        <TableCell>#12345</TableCell>
                        <TableCell>박민수</TableCell>
                        <TableCell>2024-01-15</TableCell>
                    </TableRow>
                </TableBodyComponent>
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
                <TableHeaderComponent>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>액션</TableCell>
                    </TableRow>
                </TableHeaderComponent>
                <TableBodyComponent>
                    <TableRow>
                        <TableCell>001</TableCell>
                        <TableCell>활성</TableCell>
                        <TableCell>편집</TableCell>
                    </TableRow>
                </TableBodyComponent>
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
                <TableHeaderComponent>
                    <TableRow>
                        <TableCell>프로젝트명</TableCell>
                        <TableCell>진행률</TableCell>
                        <TableCell>마감일</TableCell>
                    </TableRow>
                </TableHeaderComponent>
                <TableBodyComponent>
                    <TableRow>
                        <TableCell>웹사이트 리뉴얼</TableCell>
                        <TableCell>75%</TableCell>
                        <TableCell>2024-03-15</TableCell>
                    </TableRow>
                </TableBodyComponent>
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
                    <TableHeaderComponent>
                        <TableRow>
                            <TableCell>이름</TableCell>
                            <TableCell>나이</TableCell>
                        </TableRow>
                    </TableHeaderComponent>
                    <TableBodyComponent>
                        <TableRow>
                            <TableCell>홍길동</TableCell>
                            <TableCell>25</TableCell>
                        </TableRow>
                    </TableBodyComponent>
                </Table>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4">Bordered Table</h3>
                <Table variant="bordered" size="md">
                    <TableHeaderComponent>
                        <TableRow>
                            <TableCell>제품</TableCell>
                            <TableCell>가격</TableCell>
                        </TableRow>
                    </TableHeaderComponent>
                    <TableBodyComponent>
                        <TableRow>
                            <TableCell>노트북</TableCell>
                            <TableCell>1,200,000원</TableCell>
                        </TableRow>
                    </TableBodyComponent>
                </Table>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4">Striped Table</h3>
                <Table variant="striped" size="md">
                    <TableHeaderComponent>
                        <TableRow>
                            <TableCell>학생</TableCell>
                            <TableCell>점수</TableCell>
                        </TableRow>
                    </TableHeaderComponent>
                    <TableBodyComponent variant="striped">
                        <TableRow>
                            <TableCell>김철수</TableCell>
                            <TableCell>95</TableCell>
                        </TableRow>
                    </TableBodyComponent>
                </Table>
            </div>
        </div>
    ),
};
