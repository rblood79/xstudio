// src/builder/components/DynamicComponentLoader.tsx
import React, { lazy, Suspense } from 'react';

// 컴포넌트 맵 정의 (코드 스플리팅)
const componentMap: Record<string, React.LazyExoticComponent<React.ComponentType<unknown>>> = {
    'Button': lazy(() => import('./Button').then(module => ({ default: module.Button }))),
    'TextField': lazy(() => import('./TextField').then(module => ({ default: module.TextField }))),
    'Checkbox': lazy(() => import('./Checkbox').then(module => ({ default: module.Checkbox }))),
    'CheckboxGroup': lazy(() => import('./CheckboxGroup').then(module => ({ default: module.CheckboxGroup }))),
    'Radio': lazy(() => import('./Radio').then(module => ({ default: module.Radio }))),
    'RadioGroup': lazy(() => import('./RadioGroup').then(module => ({ default: module.RadioGroup }))),
    'Select': lazy(() => import('./Select').then(module => ({ default: module.Select }))),
    'ComboBox': lazy(() => import('./ComboBox').then(module => ({ default: module.ComboBox }))),
    'ListBox': lazy(() => import('./ListBox').then(module => ({ default: module.ListBox }))),
    'GridList': lazy(() => import('./GridList').then(module => ({ default: module.GridList }))),
    'Tree': lazy(() => import('./Tree').then(module => ({ default: module.Tree }))),
    'Table': lazy(() => import('./Table').then(module => ({ default: module.Table }))),
    'Tabs': lazy(() => import('./Tabs').then(module => ({ default: module.Tabs }))),
    'Dialog': lazy(() => import('./Dialog').then(module => ({ default: module.Dialog }))),
    'Modal': lazy(() => import('./Modal').then(module => ({ default: module.Modal }))),
    'Popover': lazy(() => import('./Popover').then(module => ({ default: module.Popover }))),
    'ToggleButton': lazy(() => import('./ToggleButton').then(module => ({ default: module.ToggleButton }))),
    'ToggleButtonGroup': lazy(() => import('./ToggleButtonGroup').then(module => ({ default: module.ToggleButtonGroup }))),
    'TagGroup': lazy(() => import('./TagGroup').then(module => ({ default: module.TagGroup }))),
    'Form': lazy(() => import('./Form').then(module => ({ default: module.Form }))),
    'Field': lazy(() => import('./Field').then(module => ({ default: module.Field }))),
    'DateField': lazy(() => import('./DateField').then(module => ({ default: module.DateField }))),
    'DatePicker': lazy(() => import('./DatePicker').then(module => ({ default: module.DatePicker }))),
    'DateRangePicker': lazy(() => import('./DateRangePicker').then(module => ({ default: module.DateRangePicker }))),
    'TimeField': lazy(() => import('./TimeField').then(module => ({ default: module.TimeField }))),
    'Switch': lazy(() => import('./Switch').then(module => ({ default: module.Switch }))),
    'Slider': lazy(() => import('./Slider').then(module => ({ default: module.Slider }))),
    'Calendar': lazy(() => import('./Calendar').then(module => ({ default: module.Calendar }))),
    'Card': lazy(() => import('./Card').then(module => ({ default: module.Card }))),
    'Panel': lazy(() => import('./Panel').then(module => ({ default: module.Panel }))),
};

// 로딩 컴포넌트
const LoadingComponent = ({ componentType }: { componentType: string }) => (
    <div className="react-aria-Loading" role="status" aria-label={`Loading ${componentType}`}>
        <div className="loading-spinner" />
        <span>Loading {componentType}...</span>
    </div>
);

// 에러 컴포넌트
const ErrorComponent = ({
    componentType,
    error,
    retry
}: {
    componentType: string;
    error: Error;
    retry: () => void;
}) => (
    <div className="react-aria-Error" role="alert">
        <div className="error-icon">⚠️</div>
        <div className="error-content">
            <h4>Failed to load {componentType}</h4>
            <p>{error.message}</p>
            <button onClick={retry} className="retry-button">
                Retry
            </button>
        </div>
    </div>
);

// 에러 바운더리
class ComponentErrorBoundary extends React.Component<
    { children: React.ReactNode; componentType: string },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: React.ReactNode; componentType: string }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`Component ${this.props.componentType} failed to load:`, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <ErrorComponent
                    componentType={this.props.componentType}
                    error={this.state.error!}
                    retry={() => this.setState({ hasError: false, error: null })}
                />
            );
        }

        return this.props.children;
    }
}

interface DynamicComponentProps {
    componentType: string;
    [key: string]: unknown;
}

export function DynamicComponent({ componentType, ...props }: DynamicComponentProps) {
    //const [retryCount, setRetryCount] = React.useState(0);

    const Component = React.useMemo(() => {
        const loader = componentMap[componentType];

        if (!loader) {
            console.warn(`Component type "${componentType}" not found in component map`);
            return null;
        }

        return loader;
    }, [componentType]);

    if (!Component) {
        return (
            <div className="react-aria-Error">
                <div className="error-icon">❌</div>
                <div className="error-content">
                    <h4>Component not found</h4>
                    <p>Component type "{componentType}" is not available.</p>
                </div>
            </div>
        );
    }

    return (
        <ComponentErrorBoundary componentType={componentType}>
            <Suspense fallback={<LoadingComponent componentType={componentType} />}>
                <Component {...props} />
            </Suspense>
        </ComponentErrorBoundary>
    );
}

// 컴포넌트 프리로딩 유틸리티를 별도 파일로 분리하거나 제거
// export const preloadComponent = (componentType: string) => {
//     const loader = componentMap[componentType];
//     if (loader) {
//         loader().catch(error => {
//             console.warn(`Failed to preload component ${componentType}:`, error);
//         });
//     }
// };

// export const preloadCommonComponents = () => {
//     const commonComponents = ['Button', 'TextField', 'Checkbox', 'Select'];
//     commonComponents.forEach(preloadComponent);
// };
