// 공통 CollectionItem 타입 정의
export interface CollectionItemData {
    id: string;
    type?: 'simple' | 'complex' | 'custom';
    text?: string;
    label?: string;
    description?: string;
    subtitle?: string;
    image?: {
        src: string;
        alt?: string;
        size?: 'small' | 'medium' | 'large';
    };
    icon?: {
        name: string;
        size?: number;
        color?: string;
    };
    disabled?: boolean;
    selected?: boolean;
    style?: React.CSSProperties;
    className?: string;
    metadata?: Record<string, unknown>; // 'any'를 'unknown'으로 변경
    actions?: Array<{
        id: string;
        label: string;
        icon?: string;
        onClick?: () => void;
    }>;
} 