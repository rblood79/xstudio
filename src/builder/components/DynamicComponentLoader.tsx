// src/builder/components/DynamicComponentLoader.tsx
import React, { Suspense } from 'react';
import { componentMap } from '../utils/componentMap';

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
const DynamicComponentLoader: React.FC<{
    componentType: string;
    props?: Record<string, unknown>;
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


export default DynamicComponentLoader;
