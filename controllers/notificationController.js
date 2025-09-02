
const Notification = require('../models/notification');
const socketManager = require('../socketManager');

exports.sendNotification = async (req, res) => {
    try {
        const { username, message } = req.body;
        // Legacy path: create username-based notification mapping to role/userId null
        const doc = { userId: null, role: null, message, status: 'unread' };
        const resultObj = await Notification.create(doc);
        const io = socketManager.getIo();
        io.emit('notificationAdded', resultObj);
        res.status(200).send('Notification sent successfully');
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).send('Error sending notification');
    }
};

exports.markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Notification.markAsRead(id);
        if (result.matchedCount > 0) {
            const io = socketManager.getIo();
            io.emit('notificationUpdated', { _id: id, status: 'read' });
            res.status(200).send('Notification marked as read');
        } else {
            res.status(404).send('Notification not found');
        }
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).send('Error marking notification as read');
    }
};

exports.getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findAll();
        res.json(notifications);
    } catch (error) {
        res.status(500).send('Error fetching all notifications');
    }
};

// New API: GET /api/notifications
exports.listNotifications = async (req, res) => {
    try {
        const { role, userId, status = 'unread', limit = 10, page = 1 } = req.query;
        const caller = req.user;
        let rows;
        if (!role && !userId && caller.role !== 'user') {
            const { getDb } = require('../config/database');
            const { ObjectId } = require('mongodb');
            const db = getDb();
            const l = Math.max(1, Math.min(1000, Number(limit)));
            const p = Math.max(1, Number(page));
            const base = {};
            if (status) base.status = status;
            rows = await db.collection('notifications')
                .find({ $and: [base, { $or: [ { role: caller.role }, { userId: new ObjectId(caller._id) } ] }] })
                .sort({ createdAt: -1 })
                .skip((p - 1) * l)
                .limit(l)
                .toArray();
        } else {
            const filter = { role, userId, status, limit, page };
            if (caller.role === 'user') { filter.userId = caller._id; }
            rows = await Notification.list(filter);
        }
        res.json(rows);
    } catch (error) {
        console.error('Error listing notifications:', error);
        res.status(500).send('Error listing notifications');
    }
};

// New API: POST /api/notifications
exports.createNotification = async (req, res) => {
    try {
        const { userId = null, role = null, message, status = 'unread' } = req.body;
        if (!message) return res.status(400).send('message is required');
        const resultObj = await Notification.create({ userId, role, message, status });
        const io = socketManager.getIo();
        io.emit('notificationAdded', resultObj);
        res.status(201).json(resultObj);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).send('Error creating notification');
    }
};

// New API: PATCH /api/notifications/:id
exports.patchNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { status = 'read' } = req.body;
        const result = await Notification.markStatus(id, status);
        if (result.matchedCount > 0) {
            const io = socketManager.getIo();
            io.emit('notificationUpdated', { _id: id, status });
            res.status(200).send('Notification updated');
        } else {
            res.status(404).send('Notification not found');
        }
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).send('Error updating notification');
    }
};
