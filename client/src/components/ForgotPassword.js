import React, { useState } from 'react';
import { authAPI } from '../services/api';
import '../styles/ForgotPassword.css';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [debugOtp, setDebugOtp] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDebugOtp('');
    
    // Basic email validation
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    
    try {
      const response = await authAPI.forgotPassword(email);
      
      if (response.status === 'success') {
        setMessage(response.message);
        setStep(2);
        setCountdown(60);
        
        // If we're in debug mode and got an OTP back
        if (response.debugOtp) {
          setDebugOtp(response.debugOtp);
          setMessage(`OTP sent (debug mode): ${response.debugOtp}`);
        }
        
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(response.message || 'Error sending OTP');
      }
    } catch (err) {
      console.error('OTP sending error:', err);
      setError(err.response?.data?.message || 'Error sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError('');
    setDebugOtp('');
    
    try {
      const response = await authAPI.forgotPassword(email);
      
      if (response.status === 'success') {
        setMessage('OTP resent successfully');
        setCountdown(60);
        
        // If we're in debug mode and got an OTP back
        if (response.debugOtp) {
          setDebugOtp(response.debugOtp);
          setMessage(`OTP resent (debug mode): ${response.debugOtp}`);
        }
        
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(response.message || 'Error resending OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error resending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      setLoading(false);
      return;
    }
    
    try {
      const response = await authAPI.verifyOTP(email, otp);
      
      if (response.status === 'success') {
        setMessage(response.message);
        setStep(3);
      } else {
        setError(response.message || 'Invalid OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    
    try {
      const response = await authAPI.resetPassword({
        email,
        otp,
        newPassword,
        confirmPassword
      });
      
      if (response.status === 'success') {
        setMessage(response.message);
        // Clear password fields
        setNewPassword('');
        setConfirmPassword('');
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(response.message || 'Error resetting password');
        // Clear password fields on error
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error resetting password. Please try again.');
      // Clear password fields on error
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <div className="logo">
            <i className="fas fa-store"></i>
            <span>POS System</span>
          </div>
          <h2>Reset Your Password</h2>
          <p>Follow the steps to recover your account</p>
        </div>
        
        <div className="progress-indicator">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span>1</span>
            <p>Verify Email</p>
          </div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span>2</span>
            <p>Enter OTP</p>
          </div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
            <span>3</span>
            <p>New Password</p>
          </div>
        </div>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        
        {step === 1 && (
          <form onSubmit={handleSendOTP} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading || !email || !validateEmail(email)}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Send OTP
                </>
              )}
            </button>
          </form>
        )}
        
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="otp">Verification Code</label>
              <p className="otp-instruction">Enter the 6-digit code sent to {email}</p>
              <div className="input-with-icon">
                <i className="fas fa-key"></i>
                <input
                  type="text"
                  id="otp"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength="6"
                  required
                />
              </div>
              {debugOtp && (
                <div className="debug-otp">
                  <p>Debug Mode: Use this OTP - <strong>{debugOtp}</strong></p>
                </div>
              )}
              <div className="resend-otp">
                {countdown > 0 ? (
                  <span>Resend OTP in {countdown}s</span>
                ) : (
                  <button 
                    type="button" 
                    className="btn-link"
                    onClick={handleResendOTP}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Verifying...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i>
                  Verify & Continue
                </>
              )}
            </button>
          </form>
        )}
        
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="input-with-icon">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  id="newPassword"
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-with-icon">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Resetting...
                </>
              ) : (
                <>
                  <i className="fas fa-sync-alt"></i>
                  Reset Password
                </>
              )}
            </button>
          </form>
        )}
        
        <div className="back-to-login">
          <a href="/login">
            <i className="fas fa-arrow-left"></i>
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;