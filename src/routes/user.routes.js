const express = require('express');
const {
    loginUser,
    createUser,
    updateUser,
    changePassword,
    getUser
} = require('../controllers/user.controller');
const router = express.Router();

// Auth routes
router.post('/auth/login', loginUser);
router.post('/auth/register', createUser);

// User routes
router.put('/users/:phoneEmergency', updateUser);
router.get('/users/:phoneEmergency', getUser);
router.post('/users/change-password', changePassword);

module.exports = router;