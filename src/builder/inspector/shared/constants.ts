/* Inspector shared constants */

// UI Constants
export const ICON_PROPS = {
    color: '#64748b',
    size: 16,
    strokeWidth: 1.5
} as const;

// Component categories for better organization
export const COMPONENT_CATEGORIES = {
    FORM: ['TextField', 'Button', 'Checkbox', 'Select', 'ComboBox', 'RadioGroup', 'CheckboxGroup'],
    LAYOUT: ['div', 'span', 'p', 'h1', 'h2', 'h3'],
    INTERACTIVE: ['ToggleButton', 'ToggleButtonGroup', 'Tabs', 'Panel'],
    DATA: ['ListBox', 'GridList', 'Table'],
    MISC: ['Slider', 'Switch']
} as const;

// Panel types
export const INSPECTOR_PANELS = {
    DESIGN: 'design',
    PROPERTIES: 'props', 
    EVENTS: 'events'
} as const;