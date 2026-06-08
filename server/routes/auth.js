const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { db } = require('../firebase');
const { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  limit 
} = require('firebase/firestore');
const router = express.Router();

// Generate JWT Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  });
};

// Helper function to find user by email
const findUserByEmail = async (email) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error('findUserByEmail error:', error);
    return null;
  }
};

// Helper function to find user by id
const findUserById = async (id) => {
  try {
    const userRef = doc(db, 'users', id);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return null;
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('findUserById error:', error);
    return null;
  }
};
//
router.post('/debug-login', async (req, res) => {
  try {
    console.log('=== DEBUG LOGIN ===');
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;
    
    // Check if Firebase is working
    let firebaseStatus = 'unknown';
    let usersCount = 0;
    let userFound = false;
    
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      usersCount = snapshot.size;
      firebaseStatus = 'connected';
      console.log(`Found ${usersCount} users in database`);
      
      // Check if email exists
      const q = query(usersRef, where('email', '==', email), limit(1));
      const emailSnapshot = await getDocs(q);
      userFound = !emailSnapshot.empty;
      console.log(`Email ${email} exists: ${userFound}`);
      
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
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
// LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    console.log('=== LOGIN ATTEMPT ===');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await findUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }

    const token = signToken(user.id);

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      token,
      data: { user: userWithoutPassword }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});

// SIGNUP ROUTE
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
      productKey
    } = req.body;

    if (!fullName || !phoneNumber || !email || !password || !confirmPassword || 
        !storeName || !storeType || !address || !productKey) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required except PAN/VAT number'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check product key
    const productKeysRef = collection(db, 'productKeys');
    const keyQuery = query(productKeysRef, where('key', '==', productKey), where('isUsed', '==', false), limit(1));
    const keySnapshot = await getDocs(keyQuery);

    if (keySnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used product key'
      });
    }

    const validProductKeyDoc = keySnapshot.docs[0];

    // Check existing user
    const usersRef = collection(db, 'users');
    const emailQuery = query(usersRef, where('email', '==', email), limit(1));
    const emailSnapshot = await getDocs(emailQuery);
    const phoneQuery = query(usersRef, where('phoneNumber', '==', phoneNumber), limit(1));
    const phoneSnapshot = await getDocs(phoneQuery);

    if (!emailSnapshot.empty || !phoneSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone number already exists'
      });
    }

    // Create user
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
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(usersRef, newUser);

    // Mark product key as used
    const productKeyRef = doc(db, 'productKeys', validProductKeyDoc.id);
    await updateDoc(productKeyRef, {
      isUsed: true,
      usedAt: new Date(),
      usedBy: docRef.id
    });

    const token = signToken(docRef.id);

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      token,
      data: { user: { id: docRef.id, ...userWithoutPassword } }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// GET CURRENT USER
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: { user: userWithoutPassword }
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await findUserByEmail(email);
    
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a reset OTP has been sent'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    
    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      resetPasswordOTP: otp,
      resetPasswordExpires,
      updatedAt: new Date()
    });

    console.log(`OTP for ${email}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      ...(process.env.NODE_ENV === 'development' && { debugOtp: otp })
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// VERIFY OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email), where('resetPasswordOTP', '==', otp), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    const user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    
    if (user.resetPasswordExpires && user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    
    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email), where('resetPasswordOTP', '==', otp), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    
    if (user.resetPasswordExpires && user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      password: hashedPassword,
      resetPasswordOTP: null,
      resetPasswordExpires: null,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// TEST ROUTE
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth routes are working correctly!' 
  });
});

module.exports = router;