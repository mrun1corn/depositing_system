const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const mongoURI = "mongodb+srv://robin:robin01716@deposit.udyoebh.mongodb.net/?retryWrites=true&w=majority&appName=deposit";
const client = new MongoClient(mongoURI);

const usersDir = path.join(__dirname, 'data', 'users');

async function migrateData() {
    try {
        await client.connect();
        console.log("Connected to MongoDB for data migration.");

        const db = client.db("deposit"); // Use your database name
        const usersCollection = db.collection("users");
        const paymentsCollection = db.collection("payments");
        const notificationsCollection = db.collection("notifications");

        // Clear existing data in collections to prevent duplicates on re-run
        await usersCollection.deleteMany({});
        await paymentsCollection.deleteMany({});
        await notificationsCollection.deleteMany({});
        console.log("Cleared existing data in MongoDB collections.");

        const userFiles = fs.readdirSync(usersDir).filter(file => file.endsWith('.json'));

        for (const file of userFiles) {
            const username = file.replace('.json', '');
            const userFilePath = path.join(usersDir, file);
            try {
                const userData = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));

                // Insert user data into users collection
                await usersCollection.insertOne({
                    username: userData.username,
                    password: userData.password,
                    role: userData.role
                });
                console.log(`Migrated user: ${userData.username}`);

                // Insert payments into payments collection
                if (userData.payments && userData.payments.length > 0) {
                    const paymentsToInsert = userData.payments.map(p => ({
                        username: userData.username,
                        amount: parseFloat(p.amount),
                        paymentDate: p.paymentDate,
                        paymentMethod: p.paymentMethod,
                        timestamp: new Date()
                    }));
                    await paymentsCollection.insertMany(paymentsToInsert);
                    console.log(`Migrated ${paymentsToInsert.length} payments for ${userData.username}`);
                }

                // Insert notifications into notifications collection
                if (userData.notifications && userData.notifications.length > 0) {
                    const notificationsToInsert = userData.notifications.map(n => ({
                        username: userData.username,
                        message: n.message,
                        read: n.read || false,
                        timestamp: new Date()
                    }));
                    await notificationsCollection.insertMany(notificationsToInsert);
                    console.log(`Migrated ${notificationsToInsert.length} notifications for ${userData.username}`);
                }

            } catch (fileError) {
                console.error(`Error processing file ${file}:`, fileError);
            }
        }

        console.log("Data migration complete.");
    } catch (mongoError) {
        console.error("MongoDB migration error:", mongoError);
    } finally {
        await client.close();
        console.log("MongoDB connection closed.");
    }
}

migrateData();
