
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectToMongo } = require('./config/database');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');

const app = express();
app.use(express.json());
app.use(cors());

connectToMongo();

app.use('/api/auth', authRoutes);
app.use('/api', protectedRoutes);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = { app };
