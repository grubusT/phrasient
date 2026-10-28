import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { migrate } from './migrations';

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('phrasient.db').then(async (db) => {
      await db.execAsync('PRAGMA foreign_keys = ON');
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}
