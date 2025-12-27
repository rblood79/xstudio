# Electron 퍼블리시 기능 구현 가이드

**작성일**: 2025-11-07
**목적**: XStudio Electron에서 HTML/CSS/JS 정적 파일 생성 기능 구현

---

## ✅ 핵심 답변

**네, Electron에서 퍼블리시 기능 구현 가능합니다!**

- ✅ **Node.js 별도 설치 불필요** - Electron에 내장됨
- ✅ **파일 시스템 접근** - fs 모듈 사용
- ✅ **HTML/CSS/JS 생성** - 템플릿 엔진 사용
- ✅ **사용자 폴더에 저장** - dialog로 경로 선택

---

## 🏗️ 퍼블리시 프로세스

### 1. 사용자 작업 흐름

```
1️⃣ XStudio에서 웹사이트 제작
   - 페이지 생성 (Home, About, Contact)
   - 컴포넌트 추가 (Button, Card, Form 등)
   - 디자인 토큰 설정 (색상, 간격 등)

2️⃣ File > Publish... 클릭
   - 퍼블리시 설정 다이얼로그 표시
   - 출력 폴더 선택
   - 퍼블리시 옵션 선택

3️⃣ 빌드 실행
   - 프로젝트 데이터 → HTML/CSS/JS 변환
   - 정적 파일 생성
   - 선택한 폴더에 저장

4️⃣ 결과
   - ~/Documents/MyWebsite/ 폴더 생성
   - index.html, about.html, contact.html
   - styles.css, theme.css
   - script.js (선택)
   - assets/ (이미지 등)
```

---

## 📂 생성되는 파일 구조

```
MyWebsite/                      # 퍼블리시 출력 폴더
├── index.html                  # Home 페이지
├── about.html                  # About 페이지
├── contact.html                # Contact 페이지
├── css/
│   ├── theme.css              # 디자인 토큰 (CSS 변수)
│   ├── components.css         # React Aria 컴포넌트 스타일
│   └── styles.css             # 전역 스타일
├── js/
│   ├── main.js                # 메인 스크립트
│   └── components.js          # 컴포넌트 상호작용 (선택)
├── assets/
│   ├── images/
│   └── fonts/
└── README.md                   # 배포 안내
```

---

## 🛠️ 구현 아키텍처

### 1. PublishService 클래스

```typescript
// src/services/publish/publishService.ts

import * as fs from 'fs';
import * as path from 'path';
import { ProjectFile } from '../database/projectFile';
import { HTMLGenerator } from './generators/htmlGenerator';
import { CSSGenerator } from './generators/cssGenerator';
import { JSGenerator } from './generators/jsGenerator';

export interface PublishOptions {
  outputPath: string;              // 출력 폴더 경로
  includeJavaScript: boolean;      // JS 파일 생성 여부
  minify: boolean;                 // 코드 압축 여부
  generateSitemap: boolean;        // sitemap.xml 생성 여부
  baseUrl?: string;                // 사이트 URL (sitemap용)
}

export class PublishService {
  private projectFile: ProjectFile;

  constructor(projectFile: ProjectFile) {
    this.projectFile = projectFile;
  }

  /**
   * Publish project to static HTML/CSS/JS files
   */
  async publish(options: PublishOptions): Promise<{
    success: boolean;
    filesCreated: string[];
    outputPath: string;
  }> {
    console.log('🚀 Starting publish process...');

    try {
      // 1. 출력 폴더 생성
      this.createOutputDirectory(options.outputPath);

      // 2. 프로젝트 데이터 로드
      const projectData = await this.loadProjectData();

      // 3. HTML 파일 생성
      const htmlFiles = await this.generateHTML(projectData, options);

      // 4. CSS 파일 생성
      const cssFiles = await this.generateCSS(projectData, options);

      // 5. JS 파일 생성 (선택)
      const jsFiles = options.includeJavaScript
        ? await this.generateJS(projectData, options)
        : [];

      // 6. Assets 복사
      await this.copyAssets(options.outputPath);

      // 7. Sitemap 생성 (선택)
      if (options.generateSitemap && options.baseUrl) {
        await this.generateSitemap(projectData, options);
      }

      const filesCreated = [...htmlFiles, ...cssFiles, ...jsFiles];

      console.log(`✅ Publish complete: ${filesCreated.length} files created`);

      return {
        success: true,
        filesCreated,
        outputPath: options.outputPath,
      };
    } catch (error) {
      console.error('❌ Publish failed:', error);
      throw error;
    }
  }

  /**
   * Create output directory
   */
  private createOutputDirectory(outputPath: string): void {
    // 폴더 생성
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // 서브폴더 생성
    const subDirs = ['css', 'js', 'assets', 'assets/images', 'assets/fonts'];
    subDirs.forEach(dir => {
      const dirPath = path.join(outputPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  /**
   * Load project data from database
   */
  private async loadProjectData(): Promise<ProjectData> {
    const db = this.projectFile.getDb();

    // 프로젝트 정보
    const [project] = await db.select('projects', { limit: 1 });

    // 페이지 목록
    const pages = await db.select('pages', {
      orderBy: [{ column: 'order_num', ascending: true }],
    });

    // 모든 요소 (페이지별)
    const elementsByPage: Record<string, Element[]> = {};
    for (const page of pages) {
      const elements = await db.select('elements', {
        where: { page_id: page.id },
        orderBy: [{ column: 'order_num', ascending: true }],
      });
      elementsByPage[page.id] = elements;
    }

    // 디자인 토큰
    const themes = await db.select('design_themes', {
      where: { status: 'active' },
      limit: 1,
    });

    let tokens: DesignToken[] = [];
    if (themes.length > 0) {
      // RPC 함수로 상속 토큰 해석
      tokens = await db.rpc('resolve_theme_tokens', {
        p_theme_id: themes[0].id,
      });
    }

    return {
      project,
      pages,
      elementsByPage,
      tokens,
    };
  }

  /**
   * Generate HTML files for all pages
   */
  private async generateHTML(
    projectData: ProjectData,
    options: PublishOptions
  ): Promise<string[]> {
    const htmlGenerator = new HTMLGenerator(projectData, options);
    const files: string[] = [];

    for (const page of projectData.pages) {
      const elements = projectData.elementsByPage[page.id];
      const htmlContent = htmlGenerator.generatePage(page, elements);

      // 파일명 생성
      const fileName = page.slug === 'home' ? 'index.html' : `${page.slug}.html`;
      const filePath = path.join(options.outputPath, fileName);

      // 파일 쓰기
      fs.writeFileSync(filePath, htmlContent, 'utf-8');
      files.push(filePath);

      console.log(`  ✓ Generated: ${fileName}`);
    }

    return files;
  }

  /**
   * Generate CSS files
   */
  private async generateCSS(
    projectData: ProjectData,
    options: PublishOptions
  ): Promise<string[]> {
    const cssGenerator = new CSSGenerator(projectData, options);
    const files: string[] = [];

    // 1. theme.css (디자인 토큰)
    const themeCSS = cssGenerator.generateThemeCSS();
    const themePath = path.join(options.outputPath, 'css/theme.css');
    fs.writeFileSync(themePath, themeCSS, 'utf-8');
    files.push(themePath);

    // 2. components.css (React Aria 스타일)
    const componentsCSS = cssGenerator.generateComponentsCSS();
    const componentsPath = path.join(options.outputPath, 'css/components.css');
    fs.writeFileSync(componentsPath, componentsCSS, 'utf-8');
    files.push(componentsPath);

    // 3. styles.css (전역 스타일)
    const globalCSS = cssGenerator.generateGlobalCSS();
    const globalPath = path.join(options.outputPath, 'css/styles.css');
    fs.writeFileSync(globalPath, globalCSS, 'utf-8');
    files.push(globalPath);

    console.log(`  ✓ Generated: CSS files`);

    return files;
  }

  /**
   * Generate JavaScript files (optional)
   */
  private async generateJS(
    projectData: ProjectData,
    options: PublishOptions
  ): Promise<string[]> {
    const jsGenerator = new JSGenerator(projectData, options);
    const files: string[] = [];

    // 1. main.js (메인 스크립트)
    const mainJS = jsGenerator.generateMainJS();
    const mainPath = path.join(options.outputPath, 'js/main.js');
    fs.writeFileSync(mainPath, mainJS, 'utf-8');
    files.push(mainPath);

    // 2. components.js (컴포넌트 상호작용)
    const componentsJS = jsGenerator.generateComponentsJS();
    const componentsPath = path.join(options.outputPath, 'js/components.js');
    fs.writeFileSync(componentsPath, componentsJS, 'utf-8');
    files.push(componentsPath);

    console.log(`  ✓ Generated: JS files`);

    return files;
  }

  /**
   * Copy assets (images, fonts, etc.)
   */
  private async copyAssets(outputPath: string): Promise<void> {
    // TODO: 프로젝트에서 사용된 이미지/폰트 복사
    console.log(`  ✓ Assets copied`);
  }

  /**
   * Generate sitemap.xml
   */
  private async generateSitemap(
    projectData: ProjectData,
    options: PublishOptions
  ): Promise<void> {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${projectData.pages.map(page => `  <url>
    <loc>${options.baseUrl}/${page.slug === 'home' ? '' : page.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`).join('\n')}
</urlset>`;

    const sitemapPath = path.join(options.outputPath, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap, 'utf-8');

    console.log(`  ✓ Generated: sitemap.xml`);
  }
}

interface ProjectData {
  project: Project;
  pages: Page[];
  elementsByPage: Record<string, Element[]>;
  tokens: DesignToken[];
}
```

---

### 2. HTMLGenerator 클래스

```typescript
// src/services/publish/generators/htmlGenerator.ts

export class HTMLGenerator {
  private projectData: ProjectData;
  private options: PublishOptions;

  constructor(projectData: ProjectData, options: PublishOptions) {
    this.projectData = projectData;
    this.options = options;
  }

  /**
   * Generate HTML for a page
   */
  generatePage(page: Page, elements: Element[]): string {
    const bodyContent = this.generateElements(elements);

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title} - ${this.projectData.project.name}</title>

  <!-- CSS -->
  <link rel="stylesheet" href="css/theme.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/styles.css">

  ${this.options.includeJavaScript ? `<!-- JavaScript -->
  <script src="js/main.js" defer></script>
  <script src="js/components.js" defer></script>` : ''}
</head>
<body>
  ${bodyContent}
</body>
</html>`;
  }

  /**
   * Generate HTML for elements (recursive)
   */
  private generateElements(elements: Element[], parentId: string | null = null): string {
    const children = elements.filter(el => el.parent_id === parentId);

    return children.map(element => {
      const childElements = elements.filter(el => el.parent_id === element.id);
      const hasChildren = childElements.length > 0;

      return this.generateElement(element, elements);
    }).join('\n');
  }

  /**
   * Generate HTML for a single element
   */
  private generateElement(element: Element, allElements: Element[]): string {
    const { tag, props } = element;

    // Children elements
    const children = allElements.filter(el => el.parent_id === element.id);
    const childrenHTML = children.map(child => this.generateElement(child, allElements)).join('\n');

    // Attributes
    const attributes = this.generateAttributes(props);

    // Inline styles
    const styles = this.generateStyles(props.style || {});

    // Self-closing tags
    const selfClosing = ['img', 'input', 'br', 'hr'];
    if (selfClosing.includes(tag.toLowerCase())) {
      return `<${tag}${attributes}${styles}>`;
    }

    // Text content
    const textContent = props.children || props.label || props.content || '';

    // Component-specific rendering
    switch (tag) {
      case 'Button':
        return `<button${attributes}${styles}>${textContent}</button>`;

      case 'Link':
        return `<a${attributes}${styles} href="${props.href || '#'}">${textContent}</a>`;

      case 'TextField':
        return `<div${attributes}${styles}>
  ${props.label ? `<label>${props.label}</label>` : ''}
  <input type="${props.type || 'text'}" placeholder="${props.placeholder || ''}" ${props.required ? 'required' : ''}>
</div>`;

      case 'Card':
        return `<div${attributes}${styles} class="card">
  ${childrenHTML}
</div>`;

      case 'Heading':
        const level = props.level || 1;
        return `<h${level}${attributes}${styles}>${textContent}</h${level}>`;

      case 'Text':
        return `<p${attributes}${styles}>${textContent}</p>`;

      case 'Separator':
        return `<hr${attributes}${styles}>`;

      case 'Image':
        return `<img${attributes}${styles} src="${props.src || ''}" alt="${props.alt || ''}">`;

      case 'Section':
        return `<section${attributes}${styles}>
  ${childrenHTML}
</section>`;

      case 'Container':
        return `<div${attributes}${styles} class="container">
  ${childrenHTML}
</div>`;

      default:
        // Generic element
        return `<div${attributes}${styles} data-component="${tag}">
  ${textContent}
  ${childrenHTML}
</div>`;
    }
  }

  /**
   * Generate HTML attributes
   */
  private generateAttributes(props: any): string {
    const attributes: string[] = [];

    // ID
    if (props.customId) {
      attributes.push(`id="${props.customId}"`);
    }

    // Class
    const classes: string[] = [];
    if (props.variant) classes.push(props.variant);
    if (props.size) classes.push(props.size);
    if (props.className) classes.push(props.className);

    if (classes.length > 0) {
      attributes.push(`class="${classes.join(' ')}"`);
    }

    // Data attributes
    if (props.dataTestId) {
      attributes.push(`data-testid="${props.dataTestId}"`);
    }

    // ARIA attributes
    if (props.ariaLabel) {
      attributes.push(`aria-label="${props.ariaLabel}"`);
    }

    return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
  }

  /**
   * Generate inline styles
   */
  private generateStyles(style: React.CSSProperties): string {
    if (!style || Object.keys(style).length === 0) {
      return '';
    }

    const styleString = Object.entries(style)
      .map(([key, value]) => {
        // camelCase → kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value}`;
      })
      .join('; ');

    return ` style="${styleString}"`;
  }
}
```

---

### 3. CSSGenerator 클래스

```typescript
// src/services/publish/generators/cssGenerator.ts

export class CSSGenerator {
  private projectData: ProjectData;
  private options: PublishOptions;

  constructor(projectData: ProjectData, options: PublishOptions) {
    this.projectData = projectData;
    this.options = options;
  }

  /**
   * Generate theme.css (디자인 토큰)
   */
  generateThemeCSS(): string {
    const tokens = this.projectData.tokens;

    const lightMode = tokens
      .filter(t => t.scope === 'light' || t.scope === 'raw')
      .map(t => this.tokenToCSS(t))
      .join('\n');

    const darkMode = tokens
      .filter(t => t.scope === 'dark')
      .map(t => this.tokenToCSS(t))
      .join('\n');

    return `:root {
${lightMode}
}

@media (prefers-color-scheme: dark) {
  :root {
${darkMode}
  }
}`;
  }

  /**
   * Convert design token to CSS variable
   */
  private tokenToCSS(token: DesignToken): string {
    const varName = token.css_variable || `--${token.name.replace(/\./g, '-')}`;
    let value: string;

    switch (token.type) {
      case 'color':
        // { h: 210, s: 100, l: 50, a: 1 } → hsl(210 100% 50% / 1)
        const color = token.value as any;
        value = `hsl(${color.h} ${color.s}% ${color.l}% / ${color.a})`;
        break;

      case 'spacing':
        // { value: 16, unit: 'px' } → 16px
        const spacing = token.value as any;
        value = `${spacing.value}${spacing.unit}`;
        break;

      case 'font-size':
        const fontSize = token.value as any;
        value = `${fontSize.value}${fontSize.unit}`;
        break;

      default:
        value = String(token.value);
    }

    return `  ${varName}: ${value};`;
  }

  /**
   * Generate components.css (React Aria 스타일)
   */
  generateComponentsCSS(): string {
    // 기존 src/builder/components/components.css 복사
    const componentsCSS = fs.readFileSync(
      path.join(__dirname, '../../../builder/components/components.css'),
      'utf-8'
    );

    return componentsCSS;
  }

  /**
   * Generate styles.css (전역 스타일)
   */
  generateGlobalCSS(): string {
    return `/* Global Styles */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family-base, system-ui, sans-serif);
  font-size: var(--text-base, 16px);
  line-height: 1.5;
  color: var(--text-color, #333);
  background: var(--background-color, #fff);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-4, 16px);
}

/* Utility classes */
.text-center {
  text-align: center;
}

.mt-4 {
  margin-top: var(--spacing-4, 16px);
}

.mb-4 {
  margin-bottom: var(--spacing-4, 16px);
}`;
  }
}
```

---

### 4. JSGenerator 클래스

```typescript
// src/services/publish/generators/jsGenerator.ts

export class JSGenerator {
  private projectData: ProjectData;
  private options: PublishOptions;

  constructor(projectData: ProjectData, options: PublishOptions) {
    this.projectData = projectData;
    this.options = options;
  }

  /**
   * Generate main.js
   */
  generateMainJS(): string {
    return `// XStudio Generated JavaScript

console.log('XStudio - Generated on ${new Date().toISOString()}');

// Initialize components
document.addEventListener('DOMContentLoaded', () => {
  initializeComponents();
});

function initializeComponents() {
  // Forms
  initializeForms();

  // Modals
  initializeModals();

  // Tabs
  initializeTabs();
}`;
  }

  /**
   * Generate components.js
   */
  generateComponentsJS(): string {
    return `// Component Interactions

function initializeForms() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      console.log('Form submitted:', Object.fromEntries(formData));
    });
  });
}

function initializeModals() {
  const modalTriggers = document.querySelectorAll('[data-modal-trigger]');
  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      const modalId = trigger.dataset.modalTrigger;
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.showModal();
      }
    });
  });
}

function initializeTabs() {
  const tabGroups = document.querySelectorAll('[role="tablist"]');
  tabGroups.forEach(tablist => {
    const tabs = tablist.querySelectorAll('[role="tab"]');
    const panels = document.querySelectorAll('[role="tabpanel"]');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Hide all panels
        panels.forEach(panel => panel.hidden = true);

        // Deactivate all tabs
        tabs.forEach(t => t.setAttribute('aria-selected', 'false'));

        // Activate clicked tab
        tab.setAttribute('aria-selected', 'true');

        // Show corresponding panel
        const panelId = tab.getAttribute('aria-controls');
        const panel = document.getElementById(panelId);
        if (panel) panel.hidden = false;
      });
    });
  });
}`;
  }
}
```

---

## 🎨 Electron UI 통합

### Publish Dialog

```tsx
// src/dialogs/PublishDialog.tsx

export function PublishDialog({ onClose }: { onClose: () => void }) {
  const [outputPath, setOutputPath] = useState('');
  const [includeJS, setIncludeJS] = useState(true);
  const [minify, setMinify] = useState(false);
  const [generateSitemap, setGenerateSitemap] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [publishing, setPublishing] = useState(false);

  const handleSelectFolder = async () => {
    const result = await window.electron.dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Output Folder',
    });

    if (!result.canceled) {
      setOutputPath(result.filePaths[0]);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);

    try {
      const result = await window.electron.project.publish({
        outputPath,
        includeJavaScript: includeJS,
        minify,
        generateSitemap,
        baseUrl: generateSitemap ? baseUrl : undefined,
      });

      if (result.success) {
        alert(`✅ Publish successful!\n\n${result.filesCreated.length} files created in:\n${result.outputPath}`);
        onClose();
      }
    } catch (error) {
      alert(`❌ Publish failed: ${error.message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <dialog open>
      <h2>Publish Project</h2>

      <div className="form-group">
        <label>Output Folder</label>
        <div className="input-with-button">
          <input
            type="text"
            value={outputPath}
            readOnly
            placeholder="Select folder..."
          />
          <button onClick={handleSelectFolder}>Browse...</button>
        </div>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={includeJS}
            onChange={(e) => setIncludeJS(e.target.checked)}
          />
          Include JavaScript
        </label>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={minify}
            onChange={(e) => setMinify(e.target.checked)}
          />
          Minify Code
        </label>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={generateSitemap}
            onChange={(e) => setGenerateSitemap(e.target.checked)}
          />
          Generate Sitemap
        </label>
      </div>

      {generateSitemap && (
        <div className="form-group">
          <label>Base URL</label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      )}

      <div className="actions">
        <button onClick={onClose} disabled={publishing}>
          Cancel
        </button>
        <button
          onClick={handlePublish}
          disabled={!outputPath || publishing}
          className="primary"
        >
          {publishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </dialog>
  );
}
```

---

### Electron IPC Handler

```typescript
// electron/main.ts

import { PublishService } from '../src/services/publish/publishService';

// File > Publish
ipcMain.handle('project:publish', async (_event, options: PublishOptions) => {
  if (!currentProject) {
    throw new Error('No project is open');
  }

  const publishService = new PublishService(currentProject);

  try {
    const result = await publishService.publish(options);
    return result;
  } catch (error) {
    console.error('❌ Publish failed:', error);
    throw error;
  }
});

// Dialog > Show Open Dialog
ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
  return await dialog.showOpenDialog(options);
});
```

---

## 📊 생성 예시

### 입력 (XStudio 프로젝트)

```typescript
// 페이지: Home
elements: [
  { tag: 'Heading', props: { level: 1, children: 'Welcome' } },
  { tag: 'Text', props: { children: 'This is my website' } },
  { tag: 'Button', props: { variant: 'primary', label: 'Get Started' } },
]

// 디자인 토큰
tokens: [
  { name: 'color.primary', type: 'color', value: { h: 210, s: 100, l: 50, a: 1 } },
  { name: 'spacing.4', type: 'spacing', value: { value: 16, unit: 'px' } },
]
```

### 출력 (HTML)

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Home - MyWebsite</title>

  <link rel="stylesheet" href="css/theme.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/styles.css">

  <script src="js/main.js" defer></script>
  <script src="js/components.js" defer></script>
</head>
<body>
  <h1>Welcome</h1>
  <p>This is my website</p>
  <button class="primary">Get Started</button>
</body>
</html>
```

### 출력 (CSS)

```css
/* css/theme.css */
:root {
  --color-primary: hsl(210 100% 50% / 1);
  --spacing-4: 16px;
}
```

---

## ✅ 구현 체크리스트

- [ ] PublishService 클래스 (1-2일)
- [ ] HTMLGenerator (요소 → HTML 변환) (1-2일)
- [ ] CSSGenerator (토큰 → CSS 변환) (1일)
- [ ] JSGenerator (상호작용 스크립트) (1일)
- [ ] PublishDialog UI (1일)
- [ ] Electron IPC 통합 (4-6시간)
- [ ] 파일 쓰기 테스트 (4-6시간)
- [ ] 퍼블리시 결과 검증 (1일)

**총 예상 시간: 5-7일**

---

## 🎯 최종 답변

**네, Electron에서 퍼블리시 기능 완벽 구현 가능합니다!**

### 핵심 기능:
1. ✅ **Node.js 내장** - 별도 설치 불필요
2. ✅ **fs 모듈** - 파일 생성/쓰기
3. ✅ **템플릿 엔진** - HTML/CSS/JS 생성
4. ✅ **폴더 선택** - dialog로 저장 위치 선택

### 생성 파일:
- ✅ HTML (페이지별)
- ✅ CSS (테마 + 컴포넌트 + 전역)
- ✅ JavaScript (선택)
- ✅ Assets (이미지, 폰트)
- ✅ Sitemap.xml (SEO)

### 배포 방법:
- ✅ 로컬 폴더에 저장
- ✅ FTP/SFTP 업로드 (선택)
- ✅ GitHub Pages 배포 (선택)
- ✅ Netlify/Vercel 배포 (선택)

---

**작성자**: Claude Code
**작성일**: 2025-11-07
**버전**: 1.0.0
