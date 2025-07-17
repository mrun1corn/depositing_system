
const authorize = (allowedRoles) => (req, res, next) => {
    const { role } = req.user;

    if (!allowedRoles.includes(role)) {
        return res.status(403).send('Access Denied: Insufficient role.');
    }

    next();
};

module.exports = authorize;
