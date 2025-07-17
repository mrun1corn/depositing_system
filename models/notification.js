
const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');

class Notification {
    constructor(username, message) {
        this.username = username;
        this.message = message;
        this.read = false;
        this.timestamp = new Date();
    }

    async save() {
        const db = getDb();
        const result = await db.collection('notifications').insertOne(this);
        return result;
    }

    static async findById(id) {
        const db = getDb();
        const notification = await db.collection('notifications').findOne({ _id: new ObjectId(id) });
        return notification;
    }

    static async findAll() {
        const db = getDb();
        const notifications = await db.collection('notifications').find({}).toArray();
        return notifications;
    }

    static async markAsRead(id) {
        const db = getDb();
        const result = await db.collection('notifications').updateOne({ _id: new ObjectId(id) }, { $set: { read: true } });
        return result;
    }
}

module.exports = Notification;
