// utils/notifications.js
import { notificationAPI } from '../services/api';

export const createNotification = async (userId, type, message, relatedTo = null, relatedId = null) => {
  try {
    // In a real application, you would have server-side logic to create notifications
    // For now, we'll use the API directly
    const response = await notificationAPI.createNotification({
      type,
      message,
      relatedTo,
      relatedId
    });
    
    return response.success;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

// Pre-defined notification templates
export const notificationTemplates = {
  attendanceMarked: (staffName, status) => 
    `${staffName} marked as ${status} for today`,
  
  leaveRequested: (staffName, leaveType, days) => 
    `${staffName} requested ${days} days of ${leaveType} leave`,
  
  leaveApproved: (staffName, leaveType) => 
    `${staffName}'s ${leaveType} leave request has been approved`,
  
  leaveRejected: (staffName, leaveType) => 
    `${staffName}'s ${leaveType} leave request has been rejected`,
  
  payrollProcessed: (staffName, amount) => 
    `Payroll processed for ${staffName}: NPR ${amount}`,
  
  shiftChanged: (staffName, oldShift, newShift) => 
    `${staffName}'s shift changed from ${oldShift} to ${newShift}`,
  
  performanceTarget: (staffName, percentage) => 
    `${staffName} achieved ${percentage}% of performance target`,
  
  systemAlert: (message) => 
    `System Alert: ${message}`
};

// Example usage:
// createNotification(userId, 'attendance', notificationTemplates.attendanceMarked('John Doe', 'Present'));