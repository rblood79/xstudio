
import type { Meta, StoryObj } from '@storybook/react';
import { DataGrid } from '../src/builder/components/DataGrid';
import { largeMockData } from '../src/api/mockLargeDataV2';

const meta: Meta<typeof DataGrid> = {
    title: 'Builder/Components/DataGrid',
    component: DataGrid,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: '대용량 데이터를 처리하기 위한 DataGrid 컴포넌트입니다. React Aria Table 기반으로 구축되었으며, 템플릿 및 가상화(임시) 기능을 지원합니다.',
            },
        },
    },
    argTypes: {
        data: {
            control: 'object',
            description: 'DataGrid에 표시할 데이터 배열',
        },
        columns: {
            control: 'object',
            description: '데이터 테이블의 컬럼 정의 (key, label 포함)',
        },
        itemTemplate: {
            control: 'text',
            description: '각 셀의 내용을 정의하는 템플릿 문자열 (예: {{name}} - {{email}})',
        },
        maxRows: {
            control: 'number',
            description: '가상화를 위해 최대로 보여줄 행 수',
        },
        selectionMode: {
            control: 'radio',
            options: ['none', 'single', 'multiple'],
            description: '테이블의 선택 모드',
        },
    },
};

export default meta;
type Story = StoryObj<typeof DataGrid>;

export const Default: Story = {
    args: {
        data: largeMockData,
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '이름' },
            { key: 'email', label: '이메일' },
            { key: 'address', label: '주소' },
            { key: 'phone', label: '전화번호' },
            { key: 'jobTitle', label: '직업' },
        ],
        itemTemplate: '{{name}} ({{jobTitle}})',
        maxRows: 10,
        selectionMode: 'multiple',
    },
};

export const AllData: Story = {
    args: {
        data: largeMockData,
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '이름' },
            { key: 'email', label: '이메일' },
            { key: 'address', label: '주소' },
            { key: 'phone', label: '전화번호' },
            { key: 'jobTitle', label: '직업' },
        ],
        itemTemplate: '{{name}}',
        maxRows: 5000, // 전체 데이터 렌더링 (가상화 미적용)
        selectionMode: 'none',
    },
};

export const CustomTemplate: Story = {
    args: {
        data: largeMockData,
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '이름' },
            { key: 'email', label: '이메일' },
        ],
        itemTemplate: '고객: {{name}} / 연락처: {{phone}} / 직업: {{jobTitle}}',
        maxRows: 5,
        selectionMode: 'single',
    },
};
