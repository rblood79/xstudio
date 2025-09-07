/**
 * Property editor labels - English only for consistency
 * Used across all property editors for consistent labeling
 */
export const PROPERTY_LABELS = {
    // Common properties
    LABEL: 'Label',
    DESCRIPTION: 'Description',
    ERROR_MESSAGE: 'Error Message',
    PLACEHOLDER: 'Placeholder',
    VALUE: 'Value',
    DISABLED: 'Disabled',
    READONLY: 'Read Only',
    REQUIRED: 'Required',
    AUTO_FOCUS: 'Auto Focus',

    // Text and content
    TEXT: 'Text',
    CHILDREN: 'Children',
    TITLE: 'Title',
    DEFAULT_VALUE: 'Default Value',
    MIN_VALUE: 'Min Value',
    MAX_VALUE: 'Max Value',
    STEP: 'Step',

    // Selection properties
    SELECTED_KEY: 'Selected Key',
    DEFAULT_SELECTED_KEY: 'Default Selected Key',
    INPUT_VALUE: 'Input Value',
    DEFAULT_INPUT_VALUE: 'Default Input Value',
    ALLOWS_CUSTOM_VALUE: 'Allows Custom Value',
    MENU_TRIGGER: 'Menu Trigger',
    DISALLOW_EMPTY_SELECTION: 'Disallow Empty Selection',

    // Selection mode
    SELECTION_MODE: 'Selection Mode',
    SELECTION_BEHAVIOR: 'Selection Behavior',

    // Orientation
    ORIENTATION: 'Orientation',

    // Button types
    TYPE: 'Type',
    BUTTON: 'Button',
    SUBMIT: 'Submit',
    RESET: 'Reset',

    // Checkbox/Radio states
    SELECTED: 'Selected',
    INDETERMINATE: 'Indeterminate',

    // Switch states
    SWITCH_LABEL: 'Switch Label',

    // Actions
    ADD_OPTION: 'Add Option',
    ADD_ITEM: 'Add Item',
    ADD_RADIO: 'Add Radio Option',
    ADD_CHECKBOX: 'Add Checkbox',
    ADD_TAB: 'Add New Tab',
    ADD_TOGGLE_BUTTON: 'Add Toggle Button',
    CLOSE: 'Close',
    NO_OPTIONS: 'No options available',
    NO_ITEMS: 'No items available',

    // Management
    TAB_MANAGEMENT: 'Tab Management',
    RADIO_MANAGEMENT: 'Radio Management',
    CHECKBOX_MANAGEMENT: 'Checkbox Management',
    ITEM_MANAGEMENT: 'Item Management',
    BUTTON_MANAGEMENT: 'Button Management',

    // Menu trigger options
    MENU_TRIGGER_FOCUS: 'Focus',
    MENU_TRIGGER_INPUT: 'Input',
    MENU_TRIGGER_MANUAL: 'Manual',
    MENU_TRIGGER_CLICK: 'Click',
    MENU_TRIGGER_HOVER: 'Hover',

    // Selection mode options
    SELECTION_MODE_SINGLE: 'Single',
    SELECTION_MODE_MULTIPLE: 'Multiple',
    SELECTION_MODE_NONE: 'None',

    // Selection behavior options
    SELECTION_BEHAVIOR_TOGGLE: 'Toggle',
    SELECTION_BEHAVIOR_REPLACE: 'Replace',

    // Orientation options
    ORIENTATION_HORIZONTAL: 'Horizontal',
    ORIENTATION_VERTICAL: 'Vertical',

    // Default tab
    DEFAULT_TAB: 'Default Tab',

    // Delete actions
    DELETE_THIS_ITEM: 'Delete This Item',
    DELETE_THIS_RADIO: 'Delete This Radio',
    DELETE_THIS_CHECKBOX: 'Delete This Checkbox',
    DELETE_THIS_BUTTON: 'Delete This Button',

    // Back actions
    BACK_TO_SELECT_SETTINGS: 'Back to Select Settings',
    BACK_TO_RADIO_GROUP_SETTINGS: 'Back to RadioGroup Settings',
    BACK_TO_CHECKBOX_GROUP_SETTINGS: 'Back to CheckboxGroup Settings',
    BACK_TO_LISTBOX_SETTINGS: 'Back to ListBox Settings',
    BACK_TO_TOGGLE_BUTTON_GROUP_SETTINGS: 'Back to ToggleButtonGroup Settings',

    // Panel specific
    STYLE: 'Style',
    IS_OPEN: 'Is Open',
    IS_DISMISSABLE: 'Is Dismissable',
    TAB_INDEX: 'Tab Index',

    // Tab specific
    TAB_TITLE: 'Tab Title',
    VARIANT: 'Variant',
    APPEARANCE: 'Appearance',

    // Tab variants
    TAB_VARIANT_DEFAULT: 'Default',
    TAB_VARIANT_BORDERED: 'Bordered',
    TAB_VARIANT_UNDERLINED: 'Underlined',
    TAB_VARIANT_PILL: 'Pill',

    // Tab appearances
    TAB_APPEARANCE_LIGHT: 'Light',
    TAB_APPEARANCE_DARK: 'Dark',
    TAB_APPEARANCE_SOLID: 'Solid',
    TAB_APPEARANCE_BORDERED: 'Bordered',

    // Card specific
    SIZE: 'Size',
    IS_QUIET: 'Is Quiet',
    IS_FOCUSED: 'Is Focused',

    // Card variants
    CARD_VARIANT_DEFAULT: 'Default',
    CARD_VARIANT_ELEVATED: 'Elevated',
    CARD_VARIANT_OUTLINED: 'Outlined',

    // Card sizes
    CARD_SIZE_SMALL: 'Small',
    CARD_SIZE_MEDIUM: 'Medium',
    CARD_SIZE_LARGE: 'Large',
} as const;
