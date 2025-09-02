#!/usr/bin/env node
require('dotenv').config();
const { MongoClient } = require('mongodb');

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deposit_system';
const dbName = process.env.DB_NAME || 'deposit_system';
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

const KEEP_COLLECTIONS = new Set(['users']);

async function main() {
  const client = new MongoClient(mongoURI);
  await client.connect();
  const db = client.db(dbName);

  const collections = await db.listCollections().toArray();
  const names = collections.map(c => c.name);
  const toClear = names.filter(n => !KEEP_COLLECTIONS.has(n));

  console.log(`[ClearTestData] Database: ${dbName}`);
  console.log(`[ClearTestData] Collections found: ${names.join(', ') || '(none)'}`);
  console.log(`[ClearTestData] Will clear (except users): ${toClear.join(', ') || '(none)'}`);
  if (DRY_RUN) {
    console.log('[ClearTestData] DRY_RUN=true -> no changes applied');
    await client.close();
    return;
  }

  for (const name of toClear) {
    const result = await db.collection(name).deleteMany({});
    console.log(` - Cleared ${name}: deleted ${result.deletedCount} docs`);
  }

  console.log('[ClearTestData] Done. Users collection was preserved.');
  await client.close();
}

main().catch(err => {
  console.error('[ClearTestData] Error:', err);
  process.exit(1);
});

