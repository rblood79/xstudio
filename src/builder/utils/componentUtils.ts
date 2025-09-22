import { componentMap } from './componentMap';

export const isComponentSupported = (componentType: string): boolean => {
    return componentType in componentMap;
};

export const getSupportedComponentTypes = (): string[] => {
    return Object.keys(componentMap);
};
