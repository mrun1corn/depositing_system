

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const mongoURI = "mongodb+srv://robin:robin01716@deposit.udyoebh.mongodb.net/?retryWrites=true&w=majority&appName=deposit";
const client = new MongoClient(mongoURI);

async function manageUserPasswords() {
    try {
        await client.connect();
        console.log("Connected to MongoDB.");

        const db = client.db("deposit");
        const usersCollection = db.collection("users");

        // --- List all users ---
        console.log("\n--- Available Users ---");
        const users = await usersCollection.find({}).project({ username: 1, _id: 0 }).toArray();
        if (users.length === 0) {
            console.log("No users found in the database.");
        } else {
            users.forEach(user => console.log(`- ${user.username}`));
        }
        console.log("-----------------------");

        // --- Get username and password from command-line arguments ---
        const usernameToUpdate = process.argv[2];
        const newPassword = process.argv[3];

        if (usernameToUpdate && newPassword) {
            console.log(`\nAttempting to update password for user: ${usernameToUpdate}`);
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            const result = await usersCollection.updateOne(
                { username: usernameToUpdate },
                { $set: { password: hashedPassword } }
            );

            if (result.matchedCount === 0) {
                console.log(`User '${usernameToUpdate}' not found.`);
            } else {
                console.log(`Password for user '${usernameToUpdate}' updated successfully.`);
            }
        } else {
            console.log("\nTo update a user's password, run the script with arguments:");
            console.log("node updatePassword.js <username> <new_password>");
            console.log("Example: node updatePassword.js robin robin01716");
        }

    } catch (error) {
        console.error("Error managing user passwords:", error);
    } finally {
        await client.close();
        console.log("MongoDB connection closed.");
    }
}

manageUserPasswords();
