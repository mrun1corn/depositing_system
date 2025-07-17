
const Notification = require('../models/notification');

exports.sendNotification = async (req, res) => {
    try {
        const { username, message } = req.body;
        const notification = new Notification(username, message);
        await notification.save();
        res.status(200).send('Notification sent successfully');
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).send('Error sending notification');
    }
};

exports.markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { username: loggedInUsername, role: loggedInUserRole } = req.user;

        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).send('Notification not found');
        }

        if (loggedInUserRole === 'admin' || notification.username === loggedInUsername) {
            const result = await Notification.markAsRead(id);

            if (result.matchedCount > 0) {
                res.status(200).send('Notification marked as read');
            } else {
                res.status(500).send('Failed to mark notification as read');
            }
        } else {
            res.status(403).send('Access Denied: You can only mark your own notifications as read.');
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
