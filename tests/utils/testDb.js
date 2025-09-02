const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

async function startMemoryMongo() {
  if (process.env.MONGO_URI) {
    process.env.DB_NAME = process.env.DB_NAME || 'test_db';
    return { uri: process.env.MONGO_URI };
  }
  try {
    mongo = await MongoMemoryServer.create({});
    const uri = mongo.getUri();
    process.env.MONGO_URI = uri;
    process.env.DB_NAME = 'test_db';
    return { uri };
  } catch (e) {
    console.warn('mongodb-memory-server failed to start. If downloads are blocked, start a local Mongo (e.g., docker run -p 27017:27017 mongo:6) and set MONGO_URI.');
    throw e;
  }
}

async function stopMemoryMongo() {
  if (mongo) {
    await mongo.stop();
    mongo = null;
  }
}

module.exports = { startMemoryMongo, stopMemoryMongo };
