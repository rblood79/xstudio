# Electron + PGlite Implementation Plan

> **Last Updated**: 2025-11-17
> **Status**: Planning Phase
> **Target Release**: TBD

---

## 📋 Executive Summary

This document outlines the comprehensive implementation plan for integrating **Electron** with **PGlite** (PostgreSQL WASM) into XStudio. This integration enables XStudio to operate as a standalone desktop application with local database capabilities, while maintaining compatibility with the existing web-based Supabase architecture.

### Key Objectives

1. **Dual-Mode Support**: Enable XStudio to run in both **Electron (offline)** and **Web Browser (online)** modes
2. **Local Database**: Integrate PGlite for offline PostgreSQL database within Electron
3. **Project File Format**: Create `.xstudio` file format (PGlite database files) for project portability
4. **Database Abstraction**: Implement unified Database Abstraction Layer (DAL) for Supabase/PGlite compatibility
5. **Static Site Publishing**: Enable HTML/CSS/JS generation without requiring user Node.js installation
6. **Cloud Sync (Optional)**: Support bidirectional sync between local PGlite and Supabase cloud

---

## 🎯 Use Cases

### Primary Use Cases

1. **Closed-Network Environments**
   - Users working in air-gapped/restricted networks
   - No internet access required for core functionality
   - Local-only project storage

2. **Hybrid Workflow**
   - Offline work with local PGlite database
   - Optional sync to Supabase cloud when online
   - Seamless transition between offline/online modes

3. **Project File Sharing**
   - Export/import `.xstudio` files (self-contained PGlite databases)
   - Share projects via USB drives, email, or file servers
   - No cloud dependency for collaboration

4. **Static Site Generation**
   - Publish projects as static HTML/CSS/JS
   - No Node.js installation required on user machines
   - Leverages Electron's built-in Node.js runtime

---

## 🏗️ Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        XStudio Application                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐           ┌──────────────────┐              │
│  │  React UI      │           │  Zustand Stores  │              │
│  │  (Builder/     │◄─────────►│  (elements,      │              │
│  │   Inspector/   │           │   pages, theme)  │              │
│  │   Preview)     │           │                  │              │
│  └────────┬───────┘           └────────┬─────────┘              │
│           │                             │                        │
│           └──────────┬──────────────────┘                        │
│                      │                                           │
│           ┌──────────▼─────────────┐                             │
│           │  Database Adapter      │  ◄── Abstraction Layer     │
│           │  (DbAdapter Interface) │                             │
│           └──────────┬─────────────┘                             │
│                      │                                           │
│        ┌─────────────┴────────────────┐                          │
│        │                              │                          │
│ ┌──────▼──────────┐         ┌─────────▼────────────┐            │
│ │ SupabaseAdapter │         │  PGliteAdapter       │            │
│ │ (Web Mode)      │         │  (Electron Mode)     │            │
│ └──────┬──────────┘         └─────────┬────────────┘            │
│        │                              │                          │
├────────┼──────────────────────────────┼──────────────────────────┤
│        │                              │                          │
│ ┌──────▼──────────┐         ┌─────────▼────────────┐            │
│ │ Supabase Cloud  │         │  PGlite (WASM)       │            │
│ │ (PostgreSQL)    │         │  (In-Process DB)     │            │
│ └─────────────────┘         └──────────────────────┘            │
│                                      │                           │
│                             ┌────────▼────────┐                  │
│                             │ .xstudio File   │                  │
│                             │ (PGlite DB)     │                  │
│                             └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Database Abstraction Layer (DAL)

**Purpose**: Provide unified interface for database operations regardless of backend (Supabase or PGlite).

**Interface Definition**:
```typescript
// src/services/database/DbAdapter.ts
export interface DbAdapter {
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Projects
  getProject(id: string): Promise<Project>;
  createProject(project: Partial<Project>): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Pages
  getPages(projectId: string): Promise<Page[]>;
  createPage(page: Partial<Page>): Promise<Page>;
  updatePage(id: string, updates: Partial<Page>): Promise<Page>;
  deletePage(id: string): Promise<void>;

  // Elements
  getElements(pageId: string): Promise<Element[]>;
  createElement(element: Partial<Element>): Promise<Element>;
  createMultipleElements(elements: Partial<Element>[]): Promise<Element[]>;
  updateElement(id: string, updates: Partial<Element>): Promise<Element>;
  deleteElement(id: string): Promise<void>;

  // Design Tokens
  getTokens(projectId: string): Promise<DesignToken[]>;
  createToken(token: Partial<DesignToken>): Promise<DesignToken>;
  updateToken(id: string, updates: Partial<DesignToken>): Promise<DesignToken>;
  deleteToken(id: string): Promise<void>;

  // Design Themes
  getThemes(projectId: string): Promise<DesignTheme[]>;
  createTheme(theme: Partial<DesignTheme>): Promise<DesignTheme>;
  updateTheme(id: string, updates: Partial<DesignTheme>): Promise<DesignTheme>;
  deleteTheme(id: string): Promise<void>;

  // Transactions
  transaction<T>(callback: () => Promise<T>): Promise<T>;
}
```

#### 2. PGlite Adapter

**Purpose**: Implement DbAdapter interface using PGlite (PostgreSQL WASM).

**Implementation**:
```typescript
// src/services/database/PGliteAdapter.ts
import { PGlite } from '@electric-sql/pglite';

export class PGliteAdapter implements DbAdapter {
  private db: PGlite | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async connect(): Promise<void> {
    // Initialize PGlite with file path
    this.db = await PGlite.create(this.dbPath);

    // Run migrations
    await this.runMigrations();
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  private async runMigrations(): Promise<void> {
    // Execute SQL migrations to create tables
    // Same schema as Supabase (projects, pages, elements, etc.)
  }

  // Implement all DbAdapter methods...
  async getElements(pageId: string): Promise<Element[]> {
    const result = await this.db!.query(
      'SELECT * FROM elements WHERE page_id = $1 ORDER BY order_num',
      [pageId]
    );
    return result.rows.map(this.rowToElement);
  }

  // ... rest of implementation
}
```

#### 3. Supabase Adapter

**Purpose**: Implement DbAdapter interface using existing Supabase client.

**Implementation**:
```typescript
// src/services/database/SupabaseAdapter.ts
import { createClient } from '@supabase/supabase-js';

export class SupabaseAdapter implements DbAdapter {
  private supabase: ReturnType<typeof createClient>;

  constructor(url: string, anonKey: string) {
    this.supabase = createClient(url, anonKey);
  }

  async connect(): Promise<void> {
    // No-op for Supabase (connection managed by client)
  }

  async disconnect(): Promise<void> {
    // No-op for Supabase
  }

  // Implement all DbAdapter methods using Supabase client...
  async getElements(pageId: string): Promise<Element[]> {
    const { data, error } = await this.supabase
      .from('elements')
      .select('*')
      .eq('page_id', pageId)
      .order('order_num');

    if (error) throw error;
    return data.map(this.rowToElement);
  }

  // ... rest of implementation
}
```

#### 4. Database Service Factory

**Purpose**: Provide singleton access to appropriate DbAdapter based on runtime environment.

**Implementation**:
```typescript
// src/services/database/index.ts
import { DbAdapter } from './DbAdapter';
import { PGliteAdapter } from './PGliteAdapter';
import { SupabaseAdapter } from './SupabaseAdapter';

let dbInstance: DbAdapter | null = null;

export function getDatabase(): DbAdapter {
  if (!dbInstance) {
    if (window.electron) {
      // Electron mode - use PGlite
      const dbPath = window.electron.getCurrentProjectPath();
      dbInstance = new PGliteAdapter(dbPath);
    } else {
      // Web mode - use Supabase
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      dbInstance = new SupabaseAdapter(url, key);
    }
  }
  return dbInstance;
}

export function resetDatabase(): void {
  dbInstance = null;
}
```

#### 5. Project File (.xstudio)

**Purpose**: Self-contained PGlite database file for project portability.

**File Structure**:
```
my-project.xstudio
├── (PGlite database files - binary format)
├── /pgdata/           # PostgreSQL data directory
│   ├── base/          # Database files
│   ├── global/        # Global data
│   └── pg_wal/        # Write-Ahead Log
```

**ProjectFile Class**:
```typescript
// src/services/projectFile/ProjectFile.ts
export class ProjectFile {
  private dbPath: string;
  private db: PGliteAdapter;

  constructor(filePath: string) {
    this.dbPath = filePath;
    this.db = new PGliteAdapter(filePath);
  }

  // Open existing project file
  static async open(filePath: string): Promise<ProjectFile> {
    const file = new ProjectFile(filePath);
    await file.db.connect();
    return file;
  }

  // Create new project file
  static async create(filePath: string, project: Partial<Project>): Promise<ProjectFile> {
    const file = new ProjectFile(filePath);
    await file.db.connect();
    await file.db.createProject(project);
    return file;
  }

  // Save changes (sync PGlite to disk)
  async save(): Promise<void> {
    // PGlite auto-persists to disk
  }

  // Close project file
  async close(): Promise<void> {
    await this.db.disconnect();
  }

  // Export to Supabase cloud
  async exportToSupabase(supabaseUrl: string, anonKey: string): Promise<void> {
    const supabase = new SupabaseAdapter(supabaseUrl, anonKey);
    await supabase.connect();

    // Copy all data from PGlite to Supabase
    const project = await this.db.getProject('...');
    await supabase.createProject(project);

    const pages = await this.db.getPages(project.id);
    for (const page of pages) {
      await supabase.createPage(page);
      const elements = await this.db.getElements(page.id);
      await supabase.createMultipleElements(elements);
    }

    // ... copy tokens, themes, etc.
  }

  // Import from Supabase cloud
  static async importFromSupabase(
    filePath: string,
    projectId: string,
    supabaseUrl: string,
    anonKey: string
  ): Promise<ProjectFile> {
    const supabase = new SupabaseAdapter(supabaseUrl, anonKey);
    await supabase.connect();

    const file = new ProjectFile(filePath);
    await file.db.connect();

    // Copy all data from Supabase to PGlite
    const project = await supabase.getProject(projectId);
    await file.db.createProject(project);

    const pages = await supabase.getPages(projectId);
    for (const page of pages) {
      await file.db.createPage(page);
      const elements = await supabase.getElements(page.id);
      await file.db.createMultipleElements(elements);
    }

    return file;
  }
}
```

#### 6. Electron Main Process

**Purpose**: Manage application lifecycle, file system operations, and IPC communication.

**Implementation**:
```typescript
// electron/main.ts
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let currentProjectPath: string | null = null;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (import.meta.env.DEV) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile('dist/index.html');
  }
}

// File operations
ipcMain.handle('project:new', async () => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'XStudio Project', extensions: ['xstudio'] }],
    defaultPath: 'untitled.xstudio',
  });

  if (!result.canceled && result.filePath) {
    currentProjectPath = result.filePath;
    return result.filePath;
  }
  return null;
});

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'XStudio Project', extensions: ['xstudio'] }],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    currentProjectPath = result.filePaths[0];
    return currentProjectPath;
  }
  return null;
});

ipcMain.handle('project:save', async () => {
  // PGlite auto-persists, just return success
  return true;
});

ipcMain.handle('project:saveAs', async () => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'XStudio Project', extensions: ['xstudio'] }],
  });

  if (!result.canceled && result.filePath) {
    if (currentProjectPath) {
      // Copy current project to new location
      fs.copyFileSync(currentProjectPath, result.filePath);
    }
    currentProjectPath = result.filePath;
    return result.filePath;
  }
  return null;
});

ipcMain.handle('project:getCurrentPath', () => {
  return currentProjectPath;
});

// Publishing
ipcMain.handle('project:publish', async (event, outputPath: string) => {
  // Use PublishService to generate HTML/CSS/JS
  const publishService = new PublishService(currentProjectPath!);
  const result = await publishService.publish({
    outputPath,
    includeJavaScript: true,
    minify: true,
  });
  return result;
});

app.whenReady().then(createWindow);
```

#### 7. Electron Preload Script

**Purpose**: Expose safe IPC methods to renderer process.

**Implementation**:
```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // Project file operations
  newProject: () => ipcRenderer.invoke('project:new'),
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: () => ipcRenderer.invoke('project:save'),
  saveProjectAs: () => ipcRenderer.invoke('project:saveAs'),
  getCurrentProjectPath: () => ipcRenderer.invoke('project:getCurrentPath'),

  // Publishing
  publishProject: (outputPath: string) =>
    ipcRenderer.invoke('project:publish', outputPath),

  // Environment detection
  isElectron: true,
});
```

#### 8. Publish Service

**Purpose**: Generate static HTML/CSS/JS files from XStudio project.

**Implementation**:
```typescript
// src/services/publish/PublishService.ts
export interface PublishOptions {
  outputPath: string;
  includeJavaScript: boolean;
  minify: boolean;
}

export class PublishService {
  private db: DbAdapter;

  constructor(projectPath: string) {
    this.db = new PGliteAdapter(projectPath);
  }

  async publish(options: PublishOptions): Promise<{
    success: boolean;
    filesCreated: string[];
    outputPath: string;
  }> {
    await this.db.connect();

    // 1. Create output directory
    const fs = window.electron ? require('fs') : null;
    if (!fs) throw new Error('Publishing only available in Electron');

    fs.mkdirSync(options.outputPath, { recursive: true });
    fs.mkdirSync(`${options.outputPath}/css`, { recursive: true });
    if (options.includeJavaScript) {
      fs.mkdirSync(`${options.outputPath}/js`, { recursive: true });
    }

    // 2. Load project data
    const project = await this.db.getProject('...');
    const pages = await this.db.getPages(project.id);
    const tokens = await this.db.getTokens(project.id);
    const themes = await this.db.getThemes(project.id);

    const filesCreated: string[] = [];

    // 3. Generate HTML files (one per page)
    const htmlGenerator = new HTMLGenerator();
    for (const page of pages) {
      const elements = await this.db.getElements(page.id);
      const html = htmlGenerator.generate(page, elements, project);
      const fileName = `${page.slug || 'index'}.html`;
      fs.writeFileSync(`${options.outputPath}/${fileName}`, html);
      filesCreated.push(fileName);
    }

    // 4. Generate CSS files
    const cssGenerator = new CSSGenerator();

    // Theme CSS (design tokens)
    const themeCSS = cssGenerator.generateTheme(tokens, themes);
    fs.writeFileSync(`${options.outputPath}/css/theme.css`, themeCSS);
    filesCreated.push('css/theme.css');

    // Component CSS
    const componentCSS = cssGenerator.generateComponents();
    fs.writeFileSync(`${options.outputPath}/css/components.css`, componentCSS);
    filesCreated.push('css/components.css');

    // 5. Generate JavaScript (optional)
    if (options.includeJavaScript) {
      const jsGenerator = new JSGenerator();
      const mainJS = jsGenerator.generate(pages);
      fs.writeFileSync(`${options.outputPath}/js/main.js`, mainJS);
      filesCreated.push('js/main.js');
    }

    await this.db.disconnect();

    return {
      success: true,
      filesCreated,
      outputPath: options.outputPath,
    };
  }
}
```

---

## 📦 Implementation Phases

### Phase 1: Database Abstraction Layer (2-3 days)

**Objective**: Create unified database interface and adapters.

**Tasks**:
1. ✅ Define `DbAdapter` interface
2. ✅ Implement `SupabaseAdapter` (refactor existing services)
3. ✅ Create database service factory
4. ✅ Update all existing API services to use `DbAdapter`
5. ✅ Write unit tests for adapters

**Files to Create/Modify**:
- `src/services/database/DbAdapter.ts` (new)
- `src/services/database/SupabaseAdapter.ts` (new)
- `src/services/database/index.ts` (new)
- `src/services/api/ElementsApiService.ts` (modify)
- `src/services/api/PagesApiService.ts` (modify)
- `src/services/api/ProjectsApiService.ts` (modify)

**Dependencies**:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.49.1" // Already exists
  }
}
```

### Phase 2: PGlite Integration (3-4 days)

**Objective**: Implement PGlite adapter and migrations.

**Tasks**:
1. ✅ Install PGlite dependencies
2. ✅ Implement `PGliteAdapter`
3. ✅ Create SQL migrations (same schema as Supabase)
4. ✅ Test CRUD operations with PGlite
5. ✅ Implement transaction support
6. ✅ Write integration tests

**Files to Create**:
- `src/services/database/PGliteAdapter.ts`
- `src/services/database/migrations/001_initial_schema.sql`
- `src/services/database/migrations/002_add_design_tokens.sql`
- `src/services/database/migrations/index.ts`

**Dependencies**:
```json
{
  "dependencies": {
    "@electric-sql/pglite": "^0.1.0"
  }
}
```

**SQL Migrations**:
```sql
-- migrations/001_initial_schema.sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID,
  domain TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT,
  parent_id UUID,
  order_num INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  parent_id UUID,
  tag TEXT NOT NULL,
  props JSONB,
  custom_id TEXT,
  data_binding JSONB,
  order_num INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ... rest of schema
```

### Phase 3: Electron Setup (2-3 days)

**Objective**: Configure Electron application with IPC handlers.

**Tasks**:
1. ✅ Install Electron dependencies
2. ✅ Create `electron/main.ts` (main process)
3. ✅ Create `electron/preload.ts` (preload script)
4. ✅ Configure Vite for Electron build
5. ✅ Implement file dialog handlers (New/Open/Save/SaveAs)
6. ✅ Test Electron app launch

**Files to Create**:
- `electron/main.ts`
- `electron/preload.ts`
- `electron.vite.config.ts`
- `src/types/electron.d.ts` (TypeScript declarations)

**Dependencies**:
```json
{
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "vite-plugin-electron": "^0.15.0",
    "vite-plugin-electron-renderer": "^0.14.0"
  }
}
```

**TypeScript Declarations**:
```typescript
// src/types/electron.d.ts
interface Window {
  electron?: {
    isElectron: true;
    newProject: () => Promise<string | null>;
    openProject: () => Promise<string | null>;
    saveProject: () => Promise<boolean>;
    saveProjectAs: () => Promise<string | null>;
    getCurrentProjectPath: () => Promise<string | null>;
    publishProject: (outputPath: string) => Promise<{
      success: boolean;
      filesCreated: string[];
      outputPath: string;
    }>;
  };
}
```

**Vite Configuration**:
```typescript
// electron.vite.config.ts
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: 'electron/main.ts',
      vite: {
        build: {
          outDir: 'dist-electron',
        },
      },
    }),
  ],
});
```

### Phase 4: ProjectFile Class (2-3 days)

**Objective**: Implement .xstudio file format and operations.

**Tasks**:
1. ✅ Create `ProjectFile` class
2. ✅ Implement `open()`, `create()`, `save()`, `close()` methods
3. ✅ Implement `exportToSupabase()` method
4. ✅ Implement `importFromSupabase()` static method
5. ✅ Add sync status tracking
6. ✅ Write integration tests

**Files to Create**:
- `src/services/projectFile/ProjectFile.ts`
- `src/services/projectFile/SyncService.ts`
- `src/services/projectFile/types.ts`

**Sync Service** (Optional - for cloud sync):
```typescript
// src/services/projectFile/SyncService.ts
export class SyncService {
  private localDb: PGliteAdapter;
  private remoteDb: SupabaseAdapter;

  constructor(localPath: string, supabaseUrl: string, anonKey: string) {
    this.localDb = new PGliteAdapter(localPath);
    this.remoteDb = new SupabaseAdapter(supabaseUrl, anonKey);
  }

  // Bidirectional sync
  async sync(): Promise<{
    localChanges: number;
    remoteChanges: number;
    conflicts: Conflict[];
  }> {
    // 1. Fetch changes from both sides
    // 2. Detect conflicts (same entity modified on both sides)
    // 3. Apply changes with conflict resolution
    // 4. Return sync result
  }

  // Push local changes to cloud
  async push(): Promise<void> {
    // Export all local changes to Supabase
  }

  // Pull remote changes to local
  async pull(): Promise<void> {
    // Import all remote changes from Supabase
  }
}
```

### Phase 5: Publishing System (3-4 days)

**Objective**: Implement static site generation.

**Tasks**:
1. ✅ Create `PublishService` class
2. ✅ Implement `HTMLGenerator` (Element tree → HTML)
3. ✅ Implement `CSSGenerator` (Tokens → CSS)
4. ✅ Implement `JSGenerator` (optional interactivity)
5. ✅ Add minification support
6. ✅ Test publishing with complex projects

**Files to Create**:
- `src/services/publish/PublishService.ts`
- `src/services/publish/HTMLGenerator.ts`
- `src/services/publish/CSSGenerator.ts`
- `src/services/publish/JSGenerator.ts`
- `src/services/publish/types.ts`

**HTMLGenerator Details**:
```typescript
// src/services/publish/HTMLGenerator.ts
export class HTMLGenerator {
  generate(page: Page, elements: Element[], project: Project): string {
    const rootElements = elements.filter(el => !el.parent_id);
    const bodyHTML = rootElements
      .map(el => this.generateElement(el, elements))
      .join('\n');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title} - ${project.name}</title>
  <link rel="stylesheet" href="css/theme.css">
  <link rel="stylesheet" href="css/components.css">
</head>
<body>
  ${bodyHTML}
  <script src="js/main.js"></script>
</body>
</html>
    `.trim();
  }

  private generateElement(element: Element, allElements: Element[]): string {
    const { tag, props } = element;
    const children = allElements
      .filter(el => el.parent_id === element.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // Convert React Aria component to HTML
    switch (tag) {
      case 'Button':
        return this.generateButton(element, props);
      case 'TextField':
        return this.generateTextField(element, props);
      case 'Container':
        return this.generateContainer(element, children, allElements);
      // ... handle all component types
      default:
        return this.generateGeneric(element, children, allElements);
    }
  }

  private generateButton(element: Element, props: any): string {
    const attrs = this.generateAttributes(element, props);
    const styles = this.generateStyles(props.style);
    const className = props.className || '';

    return `<button${attrs}${styles} class="${className}">${props.children || ''}</button>`;
  }

  // ... other component generators
}
```

### Phase 6: UI Integration (2-3 days)

**Objective**: Update UI to support Electron features.

**Tasks**:
1. ✅ Add File menu (New/Open/Save/SaveAs/Publish)
2. ✅ Update BuilderHeader with Electron-specific actions
3. ✅ Add Publish dialog with output path selection
4. ✅ Add sync status indicator (if cloud sync enabled)
5. ✅ Update SaveService to use DbAdapter
6. ✅ Test full workflow in Electron

**Files to Modify**:
- `src/builder/main/BuilderHeader.tsx`
- `src/builder/main/BuilderCore.tsx`
- `src/services/save/saveService.ts`

**Files to Create**:
- `src/components/PublishDialog.tsx`
- `src/components/FileMenu.tsx`

### Phase 7: Testing & Documentation (2-3 days)

**Objective**: Comprehensive testing and documentation.

**Tasks**:
1. ✅ Write unit tests for all new services
2. ✅ Write integration tests for Electron IPC
3. ✅ Write E2E tests for Electron app
4. ✅ Performance testing (PGlite vs Supabase)
5. ✅ Update CLAUDE.md with Electron guidelines
6. ✅ Create user documentation

**Test Coverage Goals**:
- DbAdapter implementations: 90%+
- PublishService: 85%+
- ProjectFile: 90%+
- Electron IPC handlers: 80%+

---

## 📂 Final File Structure

```
xstudio/
├── electron/
│   ├── main.ts                    # Main process
│   ├── preload.ts                 # Preload script
│   └── tsconfig.json
│
├── src/
│   ├── services/
│   │   ├── database/
│   │   │   ├── DbAdapter.ts       # Interface
│   │   │   ├── SupabaseAdapter.ts # Supabase implementation
│   │   │   ├── PGliteAdapter.ts   # PGlite implementation
│   │   │   ├── migrations/
│   │   │   │   ├── 001_initial_schema.sql
│   │   │   │   ├── 002_add_design_tokens.sql
│   │   │   │   └── index.ts
│   │   │   └── index.ts           # Factory
│   │   │
│   │   ├── projectFile/
│   │   │   ├── ProjectFile.ts     # .xstudio file management
│   │   │   ├── SyncService.ts     # Cloud sync (optional)
│   │   │   └── types.ts
│   │   │
│   │   └── publish/
│   │       ├── PublishService.ts  # Main orchestrator
│   │       ├── HTMLGenerator.ts   # Element → HTML
│   │       ├── CSSGenerator.ts    # Tokens → CSS
│   │       ├── JSGenerator.ts     # Optional JS
│   │       └── types.ts
│   │
│   ├── components/
│   │   ├── FileMenu.tsx           # File operations menu
│   │   └── PublishDialog.tsx      # Publish dialog
│   │
│   └── types/
│       └── electron.d.ts          # Electron TypeScript declarations
│
├── docs/
│   └── implementation/
│       └── ELECTRON_PGLITE_IMPLEMENTATION_PLAN.md  # This file
│
├── electron.vite.config.ts        # Vite config for Electron
├── package.json                   # Updated dependencies
└── README.md                      # Updated with Electron usage
```

---

## ⏱️ Timeline & Estimates

| Phase | Duration | Dependencies | Deliverable |
|-------|----------|--------------|-------------|
| **Phase 1**: Database Abstraction Layer | 2-3 days | None | Working DbAdapter with Supabase |
| **Phase 2**: PGlite Integration | 3-4 days | Phase 1 | PGlite adapter + migrations |
| **Phase 3**: Electron Setup | 2-3 days | Phase 2 | Working Electron app |
| **Phase 4**: ProjectFile Class | 2-3 days | Phase 2, 3 | .xstudio file operations |
| **Phase 5**: Publishing System | 3-4 days | Phase 2, 3 | Static site generation |
| **Phase 6**: UI Integration | 2-3 days | All previous | Complete Electron UI |
| **Phase 7**: Testing & Documentation | 2-3 days | All previous | Tests + docs |
| **Total** | **16-23 days** | - | Production-ready |

**Conservative Estimate**: 23 days (~4.5 weeks)
**Optimistic Estimate**: 16 days (~3 weeks)

---

## 🚧 Risks & Considerations

### Technical Risks

1. **PGlite Stability**
   - **Risk**: PGlite is relatively new (v0.x), may have bugs
   - **Mitigation**: Extensive testing, fallback to Supabase-only mode if critical issues

2. **File Size**
   - **Risk**: PGlite database files may grow large for complex projects
   - **Mitigation**: Implement compression, provide file size warnings

3. **Performance**
   - **Risk**: PGlite performance may lag behind native PostgreSQL
   - **Mitigation**: Benchmark critical operations, optimize queries

4. **Migration Compatibility**
   - **Risk**: Schema differences between Supabase and PGlite
   - **Mitigation**: Use identical SQL migrations, automated compatibility tests

### Implementation Risks

1. **IPC Complexity**
   - **Risk**: Electron IPC can introduce race conditions
   - **Mitigation**: Use async/await consistently, comprehensive error handling

2. **Sync Conflicts**
   - **Risk**: Bidirectional sync can cause data conflicts
   - **Mitigation**: Implement conflict detection and resolution UI (Phase 4)

3. **Breaking Changes**
   - **Risk**: Refactoring existing services may introduce bugs
   - **Mitigation**: Comprehensive test coverage before and after refactoring

---

## ✅ Success Criteria

1. **Dual-Mode Operation**
   - ✅ XStudio runs in both Electron and web browser
   - ✅ Same codebase for both environments (minimal conditional logic)

2. **Data Persistence**
   - ✅ .xstudio files can be created, opened, and saved
   - ✅ Data persists correctly between sessions
   - ✅ No data loss during file operations

3. **Publishing**
   - ✅ Static HTML/CSS/JS generation works correctly
   - ✅ Published sites render identically to Preview
   - ✅ No Node.js required on user machines

4. **Performance**
   - ✅ PGlite operations < 100ms for typical CRUD (95th percentile)
   - ✅ .xstudio file size < 10MB for typical projects
   - ✅ Publishing completes in < 5 seconds for 10-page projects

5. **Reliability**
   - ✅ Zero data corruption incidents
   - ✅ Graceful error handling for all file operations
   - ✅ Test coverage > 80% for critical paths

---

## 📚 References

### Documentation
- [PGlite Documentation](https://github.com/electric-sql/pglite)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)

### Related XStudio Documents
- `docs/supabase-schema.md` - Database schema reference
- `src/types/builder/unified.types.ts` - Core type definitions
- `src/services/api/` - Existing API services to refactor

### Similar Projects
- [VSCode](https://github.com/microsoft/vscode) - Electron architecture
- [Obsidian](https://obsidian.md/) - Local-first with cloud sync
- [Figma Desktop](https://www.figma.com/) - Dual web/desktop app

---

## 🔄 Future Enhancements (Post-MVP)

1. **Real-time Collaboration** (Phase 8)
   - Conflict-free Replicated Data Types (CRDTs)
   - Operational Transformation (OT)
   - Multi-user editing support

2. **Advanced Sync** (Phase 9)
   - Selective sync (only specific pages/elements)
   - Sync scheduling (auto-sync every N minutes)
   - Offline queue for failed syncs

3. **Plugin System** (Phase 10)
   - Custom component libraries
   - Export plugins (PDF, PNG, etc.)
   - Integration plugins (WordPress, Shopify, etc.)

4. **Version Control** (Phase 11)
   - Git-like versioning for .xstudio files
   - Branching and merging
   - Diff viewer for changes

---

**Document Version**: 1.0
**Next Review**: After Phase 1 completion
**Owner**: Development Team
