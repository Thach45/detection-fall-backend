const User = require("../models/user.model");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

const loginUser = async (req, res) => {
    try {
        const { phoneEmergency, password } = req.body;
        
        if (!phoneEmergency || !password) {
            return res.status(400).json({ message: "Số điện thoại và mật khẩu là bắt buộc" });
        }

        const user = await User.findOne({ phoneEmergency });
        if (!user) {
            return res.status(404).json({ message: "Tài khoản không tồn tại" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Mật khẩu không đúng" });
        }

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(200).json({
            message: "Đăng nhập thành công",
            user: userResponse
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: "Lỗi server, vui lòng thử lại sau" });
    }
};

const createUser = async (req, res) => {
    try {
        const { phoneEmergency, password, deviceId } = req.body;

        if (!phoneEmergency || !password || !deviceId) {
            return res.status(400).json({
                message: "Số điện thoại, mật khẩu và họ tên là bắt buộc"
            });
        }

        const existingUser = await User.findOne({ phoneEmergency });
        if (existingUser) {
            return res.status(409).json({
                message: "Số điện thoại đã được đăng ký"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        const user = new User({
            ...req.body,
            password: hashedPassword
        });
        console.log(user);
        await user.save();

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(201).json({
            message: "Đăng ký thành công",
            user: userResponse
        });
    } catch (error) {
        console.error('Create user error:', error);
        return res.status(500).json({
            message: "Lỗi server, vui lòng thử lại sau"
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { phoneEmergency } = req.params;
        const updates = req.body;

        // Prevent password update through this endpoint
        delete updates.password;
        console.log(updates);
        
        const user = await User.findOneAndUpdate(
            { phoneEmergency },
            { $set: updates },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng"
            });
        }

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(200).json({
            message: "Cập nhật thông tin thành công",
            user: userResponse
        });
    } catch (error) {
        console.error('Update user error:', error);
        return res.status(500).json({
            message: "Lỗi server, vui lòng thử lại sau"
        });
    }
};
const getUser = async (req, res) => {
    try {
        const { phoneEmergency } = req.params;
        console.log(phoneEmergency);
        const user = await User.findOne({ phoneEmergency }).select('-password');
        if (!user) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng"
            });
        }
        return res.status(200).json({
            message: "Lấy thông tin người dùng thành công",
            user
        });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            message: "Lỗi server, vui lòng thử lại sau"
        });
    }
}
const changePassword = async (req, res) => {
    try {
        const { phoneEmergency, currentPassword, newPassword } = req.body;

        if (!phoneEmergency || !currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Vui lòng điền đầy đủ thông tin"
            });
        }

        const user = await User.findOne({ phoneEmergency });
        if (!user) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng"
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Mật khẩu hiện tại không đúng"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({
            message: "Đổi mật khẩu thành công"
        });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            message: "Lỗi server, vui lòng thử lại sau"
        });
    }
};

module.exports = {
    loginUser,
    createUser,
    updateUser,
    changePassword,
    getUser
};