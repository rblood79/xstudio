import React from 'react';
import { TokenValue } from './designTokens';

type AriaRole = 'button' | 'checkbox' | 'menuitem' | 'menubar' | 'navigation' | 'progressbar' | 'separator' | 'slider' | 'switch' | 'tab' | 'tabpanel' | 'textbox' | 'presentation' | undefined;

export interface ElementProps {
    style?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
    role?: AriaRole;
    tabIndex?: number;
    // HTML 글로벌 속성
    id?: string;
    title?: string;
    lang?: string;
    translate?: 'yes' | 'no';
    dir?: 'ltr' | 'rtl' | 'auto';
    hidden?: boolean;
    // 폼 관련 속성
    name?: string;
    value?: string | number | readonly string[];
    defaultValue?: string | number | readonly string[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    // ARIA 속성
    'aria-label'?: string;
    'aria-describedby'?: string;
    'aria-hidden'?: boolean;
    'aria-expanded'?: boolean;
    'aria-haspopup'?: boolean;
    'aria-controls'?: string;
    'aria-pressed'?: boolean | 'mixed';
    // 이벤트 핸들러
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    onChange?: (event: React.ChangeEvent<HTMLElement>) => void;
    onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
    onKeyUp?: (event: React.KeyboardEvent<HTMLElement>) => void;
    // 데이터 속성
    [key: `data-${string}`]: string | number | boolean | undefined;
    // 추가 속성
    [key: string]: string | number | boolean | React.CSSProperties | React.ReactNode | readonly string[] |
    ((event: React.MouseEvent<HTMLElement>) => void) |
    ((event: React.ChangeEvent<HTMLElement>) => void) |
    ((event: React.FocusEvent<HTMLElement>) => void) |
    ((event: React.KeyboardEvent<HTMLElement>) => void) |
    undefined;
}

export interface Database {
    public: {
        Tables: {
            pages: {
                Row: {
                    id: string;
                    title: string;
                    project_id: string;
                    slug: string;
                    parent_id?: string | null;
                    order_num?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            elements: {
                Row: {
                    id: string;
                    tag: string;
                    props: ElementProps;
                    page_id: string;
                    parent_id?: string | null;
                    order_num?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            design_tokens: {
                Row: {
                    id: string;
                    project_id: string;
                    name: string;
                    type: string;
                    value: TokenValue;
                    created_at?: string;
                };
            };
        };
    };
} 