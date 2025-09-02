const bcrypt = require('bcryptjs');
const { getDb } = require('../../config/database');

async function createUser({ username, password = 'pass123', role = 'user' }) {
  const db = getDb();
  const hashed = await bcrypt.hash(password, 10);
  const res = await db.collection('users').insertOne({ username, password: hashed, role });
  return { _id: res.insertedId, username, role };
}

module.exports = { createUser };

