import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create database directory if it doesn't exist
const dbPath = path.join(__dirname, '../../database.sqlite');
const dbDir = path.dirname(dbPath);

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

class Database {
  private db: sqlite3.Database;

  constructor() {
    try {
      console.log('🔗 Connecting to database at:', dbPath);
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection error:', err);
          throw err;
        }
        console.log('✅ Connected to SQLite database');
      });
      this.initializeTables();
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  private async initializeTables() {
    const run = promisify(this.db.run.bind(this.db));
    
    try {
      // Users table
      await run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          google_id TEXT UNIQUE,
          profile_picture TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Test results table
      await run(`
        CREATE TABLE IF NOT EXISTS test_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          wpm REAL NOT NULL,
          cpm REAL NOT NULL,
          accuracy REAL NOT NULL,
          total_time INTEGER NOT NULL,
          difficulty TEXT NOT NULL,
          total_characters INTEGER NOT NULL,
          correct_characters INTEGER NOT NULL,
          incorrect_characters INTEGER NOT NULL,
          test_text TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (username) REFERENCES users (username)
        )
      `);

      // Create indexes for better query performance
      await run(`
        CREATE INDEX IF NOT EXISTS idx_test_results_username 
        ON test_results (username)
      `);
      
      await run(`
        CREATE INDEX IF NOT EXISTS idx_test_results_created_at 
        ON test_results (created_at)
      `);
      
      await run(`
        CREATE INDEX IF NOT EXISTS idx_test_results_username_date 
        ON test_results (username, created_at)
      `);

      // Migration: Add new columns to users table if they don't exist
      try {
        await run(`ALTER TABLE users ADD COLUMN profile_picture TEXT`);
        console.log('✅ Added profile_picture column to users table');
      } catch (error) {
        // Column already exists, ignore error
      }


      console.log('✅ Database tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database tables:', error);
      throw error;
    }
  }

  // Generic query methods
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            lastID: this.lastID || 0, 
            changes: this.changes || 0 
          });
        }
      });
    });
  }

  close() {
    return new Promise<void>((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Create and export singleton instance
export const database = new Database();
export default database;