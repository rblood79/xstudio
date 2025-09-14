// src/builder/components/DynamicComponentLoader.tsx
import React, { lazy, Suspense } from 'react';

// Component map definition (code splitting)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const componentMap: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
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
    'FieldGroup': lazy(() => import('./Field').then(module => ({ default: module.FieldGroup }))),
    'Label': lazy(() => import('./Field').then(module => ({ default: module.Label }))),
    'Input': lazy(() => import('./Field').then(module => ({ default: module.Input }))),
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
    error
}: {
    componentType: string;
    error: Error;
}) => (
    <div className="react-aria-Error" role="alert" aria-label={`Error loading ${componentType}`}>
        <div className="error-icon">⚠️</div>
        <div className="error-content">
            <h3>Failed to load {componentType}</h3>
            <p>{error.message}</p>
        </div>
    </div>
);

// Error Boundary for component loading
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
        console.error(`Error loading component ${this.props.componentType}:`, error, errorInfo);
    }

    render() {
        if (this.state.hasError && this.state.error) {
            return <ErrorComponent componentType={this.props.componentType} error={this.state.error} />;
        }

        return this.props.children;
    }
}

// Dynamic Component Loader
export const DynamicComponentLoader: React.FC<{
    componentType: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props?: any;
}> = ({ componentType, props = {} }) => {
    const LazyComponent = componentMap[componentType];

    if (!LazyComponent) {
        return (
            <div className="react-aria-Error" role="alert">
                <div className="error-icon">❌</div>
                <div className="error-content">
                    <h3>Component not found</h3>
                    <p>Component type "{componentType}" is not supported.</p>
                </div>
            </div>
        );
    }

    return (
        <ComponentErrorBoundary componentType={componentType}>
            <Suspense fallback={<LoadingComponent componentType={componentType} />}>
                <LazyComponent {...props} />
            </Suspense>
        </ComponentErrorBoundary>
    );
};

// Component type checker
export const isComponentSupported = (componentType: string): boolean => {
    return componentType in componentMap;
};

// Get all supported component types
export const getSupportedComponentTypes = (): string[] => {
    return Object.keys(componentMap);
};

export default DynamicComponentLoader;
