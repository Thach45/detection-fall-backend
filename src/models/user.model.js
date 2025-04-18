const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
   
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    age: {
        type: Number,
        min: 1,
        max: 120
    },
    sex: {
        type: String,
        enum: ['Nam', 'Nữ', 'Khác']
    },
    address: {
        type: String,
        trim: true
    },
    hidden_disease: {
        type: String,
        trim: true
    },
    deviceId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    fullNameEmergency: {
        type: String,
        trim: true
    },
    phoneEmergency: {
        type: String,
        trim: true
    },
    emailEmergency: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
   
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;