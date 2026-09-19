import {open} from 'react-native-nitro-sqlite';
import {SCHEMA} from './schema';

const DATABASE_NAME = 'babynest.db';

let db = null;

export async function openDB() {
  // If already opened, return the same connection
  if (db) {
    return db;
  }

  // Open existing database or create a new one
  db = open({name: DATABASE_NAME});

  // Check whether database initialization has already happened
  const result = await db.execute(`PRAGMA user_version;`);

  const version = result.rows?._array?.[0]?.user_version ?? 0;

  // First-time database setup
  if (version === 0) {
    await db.executeBatchAsync(SCHEMA);

    // Mark database as initialized
    await db.execute(`PRAGMA user_version = 1;`);
  }

  return db;
}
