// 통합된 스토어 타입 정의
import { ComponentElementProps } from './componentProps';
import { DesignToken as ThemeDesignToken } from './theme';

export interface Element {
    id: string;
    tag: string;
    props: ComponentElementProps;
    parent_id?: string | null;
    order_num?: number;
    page_id: string;
    created_at?: string;
    updated_at?: string;
}

export interface Page {
    id: string;
    title: string;
    project_id: string;
    slug: string;
    parent_id?: string | null;
    order_num?: number;
    created_at?: string;
    updated_at?: string;
}

// theme.ts의 DesignToken을 재사용
export type DesignToken = ThemeDesignToken;

export interface Theme {
    id: string;
    name: string;
    project_id: string;
    is_default: boolean;
    created_at?: string;
    updated_at?: string;
}

// 성능 최적화를 위한 선택기 타입
export type Selector<T, S = unknown> = (state: S) => T;
export type EqualityFn<T> = (a: T, b: T) => boolean;

// 메모이제이션을 위한 캐시 타입
export interface MemoizedSelector<T, S = unknown> {
    selector: Selector<T, S>;
    equalityFn?: EqualityFn<T>;
    lastResult?: T;
    lastState?: S;
}
