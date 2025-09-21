import React from 'react';
import { Table as AriaTable, Row, Cell, TableHeader, TableBody, Column } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { forwardRef } from 'react';

const tableHeaderVariants = tv({
  base: 'bg-gray-50 border-b border-gray-200',
  variants: {
    variant: {
      default: '',
      dark: 'bg-gray-800 text-white',
      primary: 'bg-blue-500 text-white',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const tableCellVariants = tv({
  base: 'px-4 py-2 border-b border-gray-200',
  variants: {
    variant: {
      default: '',
      striped: 'even:bg-gray-50',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface TableProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'striped';
  size?: 'sm' | 'md' | 'lg';
  headerVariant?: 'default' | 'dark' | 'primary';
  cellVariant?: 'default' | 'striped';
  'data-testid'?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({
    children,
    className,
    variant = 'default',
    size = 'md',
    headerVariant = 'default',
    cellVariant = 'default',
    'data-testid': testId,
    ...props
  }, ref) => {
    // children이 없거나 빈 배열인 경우 기본 구조 제공
    const hasContent = children && React.Children.count(children) > 0;
    const tableContent = hasContent ? children : (
      <>
        <TableHeader className={tableHeaderVariants({ variant: headerVariant })}>
          <Column isRowHeader>이름</Column>
          <Column>나이</Column>
          <Column>이메일</Column>
        </TableHeader>
        <TableBody className={tableCellVariants({ variant: cellVariant })}>
          <Row>
            <Cell>홍길동</Cell>
            <Cell>25</Cell>
            <Cell>hong@example.com</Cell>
          </Row>
        </TableBody>
      </>
    );

    // 테이블 스타일 클래스
    const tableClasses = [
      "react-aria-Table w-full border-collapse",
      variant === 'bordered' ? 'border border-gray-300' : '',
      variant === 'striped' ? 'border border-gray-300' : '',
      size === 'sm' ? 'text-sm' : '',
      size === 'md' ? 'text-base' : '',
      size === 'lg' ? 'text-lg' : '',
      className
    ].filter(Boolean).join(' ');

    return (
      <AriaTable
        ref={ref}
        className={tableClasses}
        data-testid={testId}
        aria-label="테이블"
        selectionMode="none"
        {...props}
      >
        {tableContent}
      </AriaTable>
    );
  }
);

Table.displayName = 'Table';

// React Aria Table 관련 컴포넌트들 re-export
export {
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell
} from 'react-aria-components';