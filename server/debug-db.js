import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// Open the database
const db = new sqlite3.Database('./database.sqlite');

const get = promisify(db.get.bind(db));
const all = promisify(db.all.bind(db));

try {
  console.log('=== Database Schema ===');
  const tableInfo = await all("PRAGMA table_info(users)");
  console.log('Users table columns:');
  tableInfo.forEach(col => {
    console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });

  console.log('\n=== Existing Users ===');
  const users = await all("SELECT id, username, google_id, profile_picture, created_at FROM users LIMIT 10");
  console.log('Users in database:');
  users.forEach(user => {
    console.log(`  ID: ${user.id}, Username: ${user.username}, Google ID: ${user.google_id || 'N/A'}, Profile Picture: ${user.profile_picture || 'N/A'}`);
  });

  console.log('\n=== Google Users Specifically ===');
  const googleUsers = await all("SELECT id, username, google_id, profile_picture FROM users WHERE google_id IS NOT NULL");
  console.log('Google OAuth users:');
  googleUsers.forEach(user => {
    console.log(`  ID: ${user.id}, Username: ${user.username}, Google ID: ${user.google_id}, Profile Picture: ${user.profile_picture || 'NULL'}`);
  });

  db.close();
} catch (error) {
  console.error('Error:', error);
  db.close();
}