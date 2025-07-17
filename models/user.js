
const { getDb } = require('../config/database');

class User {
    constructor(username, password, role) {
        this.username = username;
        this.password = password;
        this.role = role || 'user';
    }

    async save() {
        const db = getDb();
        const result = await db.collection('users').insertOne(this);
        return result;
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
