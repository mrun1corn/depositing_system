
const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');

class NotificationModel {
    constructor({ userId = null, role = null, message, status = 'unread' }) {
        const isObjectId = userId && typeof userId === 'object' && userId._bsontype === 'ObjectId';
        this.userId = userId ? (isObjectId ? userId : new ObjectId(userId)) : null;
        this.role = role || null;
        this.message = message;
        this.status = status || 'unread';
        this.createdAt = new Date();
    }

    async save() {
        const db = getDb();
        const result = await db.collection('notifications').insertOne(this);
        return result;
    }

    static collection() {
        const db = getDb();
        return db.collection('notifications');
    }

    static async create(doc) {
        const n = new NotificationModel(doc);
        const res = await n.save();
        return { _id: res.insertedId, ...n };
    }

    static async findById(id) {
        const notification = await NotificationModel.collection().findOne({ _id: new ObjectId(id) });
        return notification;
    }

    static async findAll() {
        return await NotificationModel.collection().find({}).toArray();
    }

    static async list({ role, userId, status = 'unread', limit = 10, page = 1 }) {
        const filter = {};
        if (role) filter.role = role;
        if (userId) filter.userId = new ObjectId(userId);
        if (status) filter.status = status;
        const l = Math.max(1, Math.min(1000, Number(limit)));
        const p = Math.max(1, Number(page));
        const cursor = NotificationModel.collection()
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((p - 1) * l)
            .limit(l);
        return await cursor.toArray();
    }

    static async markAsRead(id) {
        return await NotificationModel.collection().updateOne({ _id: new ObjectId(id) }, { $set: { status: 'read' } });
    }

    static async markStatus(id, status = 'read') {
        return await NotificationModel.collection().updateOne({ _id: new ObjectId(id) }, { $set: { status } });
    }
}

module.exports = NotificationModel;
