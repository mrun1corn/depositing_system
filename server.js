
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectToMongo } = require('./config/database');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');

const app = express();
const path = require('path');
const http = require('http');
const server = http.createServer(app);
const socketManager = require('./socketManager');

app.use(express.json());
app.use(cors());

connectToMongo();

app.use('/api/auth', authRoutes);
app.use('/api', protectedRoutes);

app.use(express.static(__dirname));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Server started successfully.');
    socketManager.init(server); // Initialize Socket.IO after server starts listening
});

module.exports = { app, server };
