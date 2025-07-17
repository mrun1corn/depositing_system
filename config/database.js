
const { MongoClient } = require('mongodb');

const mongoURI = "mongodb+srv://robin:robin01716@deposit.udyoebh.mongodb.net/?retryWrites=true&w=majority&appName=deposit";
const client = new MongoClient(mongoURI);

let db;

async function connectToMongo() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");
        db = client.db("deposit");
    } catch (e) {
        console.error("Could not connect to MongoDB", e);
        process.exit(1);
    }
}

function getDb() {
    return db;
}

module.exports = { connectToMongo, getDb };
