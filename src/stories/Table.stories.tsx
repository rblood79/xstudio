import type { Meta, StoryObj } from '@storybook/react';
import Table from '../builder/components/Table';

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

const sampleData: User[] = [
  { id: 1, name: '홍길동', email: 'hong@example.com', age: 25 },
  { id: 2, name: '김영희', email: 'kim@example.com', age: 30 },
  { id: 3, name: '이철수', email: 'lee@example.com', age: 28 },
];

const meta: Meta<typeof Table> = {
  title: 'Builder/Components/Table',
  component: Table,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'TanStack Table 기반의 고성능 테이블 컴포넌트입니다. 가상 스크롤, 정렬, 페이지네이션을 지원합니다.',
      },
    },
  },
  argTypes: {
    data: {
      description: '테이블에 표시할 데이터 배열',
    },
    columns: {
      description: '컬럼 정의 배열',
    },
    paginationMode: {
      control: 'radio',
      options: ['pagination', 'infinite'],
      description: '페이지네이션 모드',
    },
    itemsPerPage: {
      control: 'number',
      description: '페이지당 항목 수',
    },
    height: {
      control: 'number',
      description: '테이블 높이',
    },
  },
  args: {
    data: sampleData,
    columns: [],
    paginationMode: 'pagination',
    itemsPerPage: 10,
    height: 400,
  },
};

export default meta;
type Story = StoryObj<typeof Table>;

export const BasicTable: Story = {};

export const WithPagination: Story = {
  args: {
    paginationMode: 'pagination',
    itemsPerPage: 2,
  },
};

export const InfiniteScroll: Story = {
  args: {
    paginationMode: 'infinite',
    height: 300,
  },
};
