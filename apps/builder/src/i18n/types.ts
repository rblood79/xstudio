/**
 * I18n Type Definitions
 *
 * Defines types for internationalization system
 */

/**
 * Supported locales
 */
export type SupportedLocale = 'ko-KR' | 'en-US' | 'ja-JP' | 'zh-CN';

/**
 * Direction for text layout
 */
export type Direction = 'ltr' | 'rtl';

/**
 * Locale configuration
 */
export interface LocaleConfig {
  /** Locale identifier (e.g., 'ko-KR', 'en-US') */
  locale: SupportedLocale;
  /** Display name in the locale's own language */
  name: string;
  /** Text direction */
  direction: Direction;
  /** Date format pattern */
  dateFormat: string;
  /** Time format (12h or 24h) */
  timeFormat: 12 | 24;
  /** Currency code */
  currency: string;
}

/**
 * Translation keys structure
 */
export interface TranslationKeys {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    remove: string;
    close: string;
    open: string;
    loading: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    confirm: string;
    back: string;
    next: string;
    previous: string;
    search: string;
    filter: string;
    clear: string;
    reset: string;
    apply: string;
    select: string;
    selectAll: string;
    deselectAll: string;
  };
  builder: {
    title: string;
    newProject: string;
    openProject: string;
    saveProject: string;
    addElement: string;
    deleteElement: string;
    duplicateElement: string;
    undo: string;
    redo: string;
    preview: string;
    publish: string;
    settings: string;
  };
  components: {
    button: string;
    input: string;
    select: string;
    checkbox: string;
    radio: string;
    switch: string;
    slider: string;
    datePicker: string;
    timePicker: string;
    colorPicker: string;
    fileUpload: string;
    table: string;
    form: string;
    dialog: string;
    modal: string;
    popover: string;
    tooltip: string;
    menu: string;
    tabs: string;
    accordion: string;
    card: string;
    badge: string;
    tag: string;
    progressBar: string;
    meter: string;
    calendar: string;
    tree: string;
  };
  validation: {
    required: string;
    minLength: string;
    maxLength: string;
    email: string;
    url: string;
    pattern: string;
    min: string;
    max: string;
    invalidDate: string;
    invalidTime: string;
    invalidNumber: string;
  };
  messages: {
    projectCreated: string;
    projectSaved: string;
    projectDeleted: string;
    elementAdded: string;
    elementDeleted: string;
    elementUpdated: string;
    unsavedChanges: string;
    confirmDelete: string;
    confirmLeave: string;
    noResults: string;
    loadingData: string;
    errorLoadingData: string;
  };
}

/**
 * I18n Context value
 */
export interface I18nContextValue {
  /** Current locale */
  locale: SupportedLocale;
  /** Set locale */
  setLocale: (locale: SupportedLocale) => void;
  /** Translate function */
  t: (key: string) => string;
  /** Current direction */
  direction: Direction;
  /** Current locale config */
  config: LocaleConfig;
  /** Format date */
  formatDate: (date: Date) => string;
  /** Format time */
  formatTime: (date: Date) => string;
  /** Format number */
  formatNumber: (value: number) => string;
  /** Format currency */
  formatCurrency: (value: number) => string;
}
