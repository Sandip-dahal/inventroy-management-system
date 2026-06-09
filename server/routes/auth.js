const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, isAdminSdk } = require('../firebase');
const router = express.Router();

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  });
};

const findUserByEmail = async (email) => {
  const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

const findUserById = async (id) => {
  const userDoc = await db.collection('users').doc(id).get();
  if (userDoc.exists) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
};

router.post('/debug-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    let firebaseStatus = 'unknown';
    let usersCount = 0;
    let userFound = false;

    try {
      const snapshot = await db.collection('users').get();
      usersCount = snapshot.size;
      firebaseStatus = 'connected';
      const emailSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
      userFound = !emailSnapshot.empty;
    } catch (dbError) {
      console.error('Firebase error:', dbError);
      firebaseStatus = dbError.message;
    }

    res.json({
      success: true,
      debug: {
        firebaseStatus,
        usersCount,
        emailProvided: email,
        userExists: userFound,
        passwordProvided: !!password,
        sdk: isAdminSdk ? 'admin' : 'client-compat',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password',
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password',
      });
    }

    const token = signToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      token,
      data: { user: userWithoutPassword },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      password,
      confirmPassword,
      storeName,
      storeType,
      address,
      panVatNumber,
      productKey,
    } = req.body;

    if (
      !fullName || !phoneNumber || !email || !password || !confirmPassword ||
      !storeName || !storeType || !address || !productKey
    ) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required except PAN/VAT number',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const keySnapshot = await db.collection('productKeys')
      .where('key', '==', productKey)
      .where('isUsed', '==', false)
      .limit(1)
      .get();

    if (keySnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used product key',
      });
    }

    const validProductKeyDoc = keySnapshot.docs[0];
    const emailSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    const phoneSnapshot = await db.collection('users').where('phoneNumber', '==', phoneNumber).limit(1).get();

    if (!emailSnapshot.empty || !phoneSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone number already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      fullName,
      phoneNumber,
      email,
      password: hashedPassword,
      storeName,
      storeType,
      address,
      panVatNumber: panVatNumber || null,
      productKey,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('users').add(newUser);

    await db.collection('productKeys').doc(validProductKeyDoc.id).update({
      isUsed: true,
      usedAt: new Date(),
      usedBy: docRef.id,
    });

    const token = signToken(docRef.id);
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      token,
      data: { user: { id: docRef.id, ...userWithoutPassword } },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: { user: userWithoutPassword },
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a reset OTP has been sent',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    await db.collection('users').doc(user.id).update({
      resetPasswordOTP: otp,
      resetPasswordExpires,
      updatedAt: new Date(),
    });

    console.log(`OTP for ${email}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      ...(process.env.NODE_ENV === 'development' && { debugOtp: otp }),
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const snapshot = await db.collection('users')
      .where('email', '==', email)
      .where('resetPasswordOTP', '==', otp)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    const user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

    if (user.resetPasswordExpires && user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const snapshot = await db.collection('users')
      .where('email', '==', email)
      .where('resetPasswordOTP', '==', otp)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    const user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

    if (user.resetPasswordExpires && user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.collection('users').doc(user.id).update({
      password: hashedPassword,
      resetPasswordOTP: null,
      resetPasswordExpires: null,
      updatedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working correctly!',
  });
});

module.exports = router;
