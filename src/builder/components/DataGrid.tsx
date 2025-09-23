import { Table as AriaTable, TableProps, Column as AriaColumn, Row as AriaRow, Cell as AriaCell, TableHeader as AriaTableHeader, TableBody as AriaTableBody, composeRenderProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { forwardRef } from 'react';
import { largeMockData, MockUserData } from '../../api/mockLargeDataV2';
import React from 'react';

const dataGridStyles = tv({
    base: 'w-full text-sm text-gray-700',
});

const dataGridHeaderStyles = tv({
    base: 'sticky top-0 bg-gray-100 z-10 border-b border-gray-200',
});

const dataGridRowStyles = tv({
    base: 'border-b border-gray-100 hover:bg-gray-50',
});

const dataGridCellStyles = tv({
    base: 'py-2 px-3',
});

const dataGridColumnStyles = tv({
    base: 'py-2 px-3 text-left font-semibold',
});

interface DataGridItem {
    id: string;
    [key: string]: any; // 모든 데이터 필드 수용
}

interface DataGridProps<T extends DataGridItem> extends TableProps<T> {
    data: T[];
    columns: Array<{ key: keyof T; label: string }>;
    itemTemplate?: string; // 예: '{{name}} - {{email}}'
    maxRows?: number; // 가상화를 위한 최대 행 수 (초기 임시 구현)
}

// 템플릿 문자열을 처리하여 데이터를 바인딩하는 함수
const renderTemplate = (template: string, itemData: DataGridItem): string => {
    return template.replace(/{{(\w+)}}/g, (match, key) => {
        return String(itemData[key] || match); // 키가 없으면 원본 템플릿 문자열 반환
    });
};

export const DataGrid = forwardRef<HTMLTableElement, DataGridProps<MockUserData>>(
    ({ className, data, columns, itemTemplate, maxRows = 100, ...props }, ref) => {
        // 초기 임시 가상화 로직: 데이터의 일부만 렌더링
        const virtualizedData = data.slice(0, Math.min(data.length, maxRows));

        return (
            <AriaTable
                ref={ref}
                className={dataGridStyles({ className })}
                {...props}
            >
                <AriaTableHeader className={dataGridHeaderStyles()}>
                    <AriaRow className={dataGridRowStyles()}>
                        {columns.map((column) => (
                            <AriaColumn key={String(column.key)} className={dataGridColumnStyles()}>
                                {column.label}
                            </AriaColumn>
                        ))}
                    </AriaRow>
                </AriaTableHeader>
                <AriaTableBody>
                    {virtualizedData.map((item) => (
                        <AriaRow key={String(item.id)} className={dataGridRowStyles()} id={String(item.id)}>
                            {columns.map((column) => (
                                <AriaCell key={String(column.key)} className={dataGridCellStyles()}>
                                    {itemTemplate ? renderTemplate(itemTemplate, item) : String(item[column.key])}
                                </AriaCell>
                            ))}
                        </AriaRow>
                    ))}
                </AriaTableBody>
            </AriaTable>
        );
    }
);

DataGrid.displayName = 'DataGrid';
