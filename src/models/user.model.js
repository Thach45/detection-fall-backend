const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        trim: true
    },

    phoneEmergency: {
        type: String,
        required: true,
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
    emailEmergency: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
   
}, {
    timestamps: true
});

// Xóa index cũ của trường phone nếu tồn tại
userSchema.pre('save', async function() {
  try {
    await mongoose.connection.collection('users').dropIndex('phone_1');
  } catch (error) {
    // Bỏ qua nếu index không tồn tại
    if (error.code !== 27) {
      console.error('Lỗi khi xóa index:', error);
    }
  }
});

const User = mongoose.model('User', userSchema);

// Đảm bảo xóa index phone khi khởi tạo model
User.init().then(() => {
  User.collection.dropIndex('phone_1')
    .catch(error => {
      if (error.code !== 27) {
        console.error('Lỗi khi xóa index:', error);
      }
    });
});

module.exports = User;