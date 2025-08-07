const { MongoClient } = require('mongodb');

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/deposit_system"; // Fallback for local development
const client = new MongoClient(mongoURI);

let db;

async function connectToMongo() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");
        db = client.db(new URL(mongoURI).pathname.substring(1)); // Extract DB name from URI
    } catch (e) {
        console.error("Could not connect to MongoDB", e);
        process.exit(1);
    }
}

function getDb() {
    return db;
}

module.exports = { connectToMongo, getDb };