const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');

async function logAudit({ actorId = null, action, resource, before = null, after = null, meta = {} }) {
  const db = getDb();
  const doc = {
    actorId: actorId ? new ObjectId(actorId) : null,
    action: String(action),
    resource: String(resource),
    before,
    after,
    meta,
    createdAt: new Date(),
  };
  try { await db.collection('audit_logs').insertOne(doc); } catch (_) {}
}

module.exports = { logAudit };

