
const { getDb } = require('../config/database');

class User {
    constructor(username, password, role) {
        this.username = username;
        this.password = password;
        this.role = role || 'user';
    }

    async save() {
        const db = getDb();
        if (this._id) {
            // If _id exists, it's an update operation
            const result = await db.collection('users').replaceOne({ _id: this._id }, this);
            return result.modifiedCount > 0;
        } else {
            // If _id does not exist, it's an insert operation
            const result = await db.collection('users').insertOne(this);
            this._id = result.insertedId; // Set the _id for the current object
            return result.acknowledged;
        }
    }

    static async findByUsername(username) {
        const db = getDb();
        const user = await db.collection('users').findOne({ username: username });
        return user;
    }

    static async findAll() {
        const db = getDb();
        const users = await db.collection('users').find({}).toArray();
        return users;
    }

    static async deleteByUsername(username) {
        const db = getDb();
        const result = await db.collection('users').deleteOne({ username: username });
        return result;
    }
}

module.exports = User;
