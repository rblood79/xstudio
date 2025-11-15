/**
 * Electron Main Process
 *
 * Handles window management, IPC communication, and PGlite database initialization.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// Database Setup
// ============================================

let db: any = null;

async function initializeDatabase() {
  try {
    // Dynamic import for PGlite (Node.js only)
    const { PGlite } = await import('@electric-sql/pglite');

    // Database path in userData directory
    const dbPath = path.join(app.getPath('userData'), 'xstudio.pglite');

    console.log('📂 Database path:', dbPath);

    // Initialize PGlite
    db = new PGlite(dbPath, {
      debug: process.env.NODE_ENV === 'development',
    });

    console.log('✅ PGlite initialized');

    // Run migrations
    await runMigrations();

    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

async function runMigrations() {
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Import migrations
  const { MIGRATIONS } = await import('../src/services/database/migrations.js');

  // Create migration table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Get current version
  const result = await db.query(
    'SELECT version FROM _migrations ORDER BY applied_at DESC LIMIT 1'
  );
  const currentVersion = result.rows[0]?.version || null;

  // Apply migrations
  for (const migration of MIGRATIONS) {
    if (currentVersion && migration.version <= currentVersion) {
      continue; // Already applied
    }

    console.log(`[Migration] Applying: ${migration.version} - ${migration.name}`);

    await db.exec(migration.sql);
    await db.query(
      'INSERT INTO _migrations (version, name) VALUES ($1, $2)',
      [migration.version, migration.name]
    );

    console.log(`✅ Migration applied: ${migration.version}`);
  }
}

// ============================================
// Window Management
// ============================================

let mainWindow: BrowserWindow | null = null;

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

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173'); // Vite dev server
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================
// IPC Handlers
// ============================================

// Database query handler
ipcMain.handle('db:query', async (_event, sql: string, params: any[] = []) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const result = await db.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('[DB Query Error]', error, { sql, params });
    throw error;
  }
});

// Database select handler
ipcMain.handle('db:select', async (_event, table: string, options: any = {}) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const { columns = ['*'], where, orderBy, limit, offset } = options;

  let sql = `SELECT ${columns.join(', ')} FROM ${table}`;
  const params: any[] = [];
  let paramIndex = 1;

  // WHERE clause
  if (where && Object.keys(where).length > 0) {
    const conditions = Object.entries(where).map(([key, value]) => {
      params.push(value);
      return `${key} = $${paramIndex++}`;
    });
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  // ORDER BY clause
  if (orderBy && orderBy.length > 0) {
    const orderClauses = orderBy.map(
      (order: any) => `${order.column} ${order.ascending !== false ? 'ASC' : 'DESC'}`
    );
    sql += ` ORDER BY ${orderClauses.join(', ')}`;
  }

  // LIMIT
  if (limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(limit);
  }

  // OFFSET
  if (offset) {
    sql += ` OFFSET $${paramIndex++}`;
    params.push(offset);
  }

  const result = await db.query(sql, params);
  return result.rows;
});

// Database insert handler
ipcMain.handle('db:insert', async (_event, table: string, data: any) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const records = Array.isArray(data) ? data : [data];
  if (records.length === 0) return [];

  const keys = Object.keys(records[0]);
  const columns = keys.join(', ');
  const valuePlaceholders = records.map((_: any, rowIndex: number) => {
    const placeholders = keys.map((_: any, colIndex: number) => {
      return `$${rowIndex * keys.length + colIndex + 1}`;
    });
    return `(${placeholders.join(', ')})`;
  }).join(', ');

  const params = records.flatMap((record: any) =>
    keys.map((key) => record[key])
  );

  const sql = `
    INSERT INTO ${table} (${columns})
    VALUES ${valuePlaceholders}
    RETURNING *
  `;

  const result = await db.query(sql, params);
  return result.rows;
});

// Database update handler
ipcMain.handle('db:update', async (_event, table: string, id: string, data: any) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const keys = Object.keys(data);
  const setClauses = keys.map((key, index) => `${key} = $${index + 1}`);
  const params = [...keys.map((key) => data[key]), id];

  const sql = `
    UPDATE ${table}
    SET ${setClauses.join(', ')}
    WHERE id = $${keys.length + 1}
    RETURNING *
  `;

  const result = await db.query(sql, params);
  return result.rows[0];
});

// Database delete handler
ipcMain.handle('db:delete', async (_event, table: string, id: string) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
});

// Database RPC handler
ipcMain.handle('db:rpc', async (_event, functionName: string, params: any = {}) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const paramKeys = Object.keys(params);
  const paramPlaceholders = paramKeys.map((key, index) => `${key} => $${index + 1}`);
  const paramValues = paramKeys.map((key) => params[key]);

  const sql = `SELECT * FROM ${functionName}(${paramPlaceholders.join(', ')})`;
  const result = await db.query(sql, paramValues);
  return result.rows;
});

// Get userData path
ipcMain.handle('app:getUserDataPath', () => {
  return app.getPath('userData');
});

// Get app version
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(async () => {
  // Initialize database first
  await initializeDatabase();

  // Then create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', async () => {
  // Close database
  if (db) {
    await db.close();
    console.log('✅ Database closed');
  }
});
