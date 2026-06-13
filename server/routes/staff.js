// routes/staff.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const staffController = require('../controllers/staffController');
const attendanceController = require('../controllers/attendanceController');
const payrollController = require('../controllers/payrollController');
const leaveController = require('../controllers/leaveController');
const staffSettingsController = require('../controllers/staffSettingsController');

// ==================== INITIALIZATION ROUTE (MUST COME FIRST) ====================
// Initialize staff collections
router.post('/init', auth, async (req, res) => {
  try {
    console.log('Initializing staff collections for store:', req.user.id);
    
    // Check if staff collection exists
    const staffCheck = await db.collection('staff').limit(1).get();
    if (staffCheck.empty) {
      console.log('Creating staff collection placeholder...');
      const placeholder = {
        store: req.user.id,
        name: 'System Placeholder',
        status: 'inactive',
        isPlaceholder: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const docRef = await db.collection('staff').add(placeholder);
      await db.collection('staff').doc(docRef.id).delete();
    }
    
    // Check payrolls collection
    const payrollCheck = await db.collection('payrolls').limit(1).get();
    if (payrollCheck.empty) {
      console.log('Creating payrolls collection placeholder...');
      const payrollPlaceholder = {
        store: req.user.id,
        isPlaceholder: true,
        createdAt: new Date()
      };
      const payrollRef = await db.collection('payrolls').add(payrollPlaceholder);
      await db.collection('payrolls').doc(payrollRef.id).delete();
    }
    
    // Check attendance collection
    const attendanceCheck = await db.collection('attendance').limit(1).get();
    if (attendanceCheck.empty) {
      console.log('Creating attendance collection placeholder...');
      const attendancePlaceholder = {
        store: req.user.id,
        isPlaceholder: true,
        createdAt: new Date()
      };
      const attendanceRef = await db.collection('attendance').add(attendancePlaceholder);
      await db.collection('attendance').doc(attendanceRef.id).delete();
    }
    
    // Check leaves collection
    const leavesCheck = await db.collection('leaves').limit(1).get();
    if (leavesCheck.empty) {
      console.log('Creating leaves collection placeholder...');
      const leavesPlaceholder = {
        store: req.user.id,
        isPlaceholder: true,
        createdAt: new Date()
      };
      const leavesRef = await db.collection('leaves').add(leavesPlaceholder);
      await db.collection('leaves').doc(leavesRef.id).delete();
    }
    
    res.json({ 
      success: true, 
      message: 'Staff collections initialized successfully'
    });
  } catch (error) {
    console.error('Init error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ==================== STAFF SETTINGS ROUTES (MUST COME FIRST) ====================
router.get('/settings', auth, staffSettingsController.getStaffSettings);
router.put('/settings', auth, staffSettingsController.updateStaffSettings);
router.post('/settings/reset', auth, staffSettingsController.resetStaffSettings);

// ==================== ATTENDANCE ROUTES (MUST COME BEFORE /:id) ====================
// Get attendance report with filters (for all staff)
router.get('/attendance/report', auth, attendanceController.getAttendanceReport);

// Get today's attendance summary
router.get('/attendance/today', auth, attendanceController.getTodaysAttendance);

// Mark attendance
router.post('/attendance/mark', auth, attendanceController.markAttendance);

// ==================== PAYROLL ROUTES (MUST COME BEFORE /:id) ====================
router.get('/payroll/summary', auth, payrollController.getPayrollSummary);
router.get('/payroll/history', auth, payrollController.getPayrolls);
router.get('/payroll/check-exists', auth, payrollController.checkPayrollExists);
router.post('/payroll/generate', auth, payrollController.generatePayroll);
router.put('/payroll/:id', auth, payrollController.updatePayroll);
router.patch('/payroll/:id/status', auth, payrollController.updatePayrollStatus);
router.get('/payroll/:id', auth, payrollController.getPayrollById);

// ==================== LEAVE ROUTES (MUST COME BEFORE /:id) ====================
router.get('/leave/requests', auth, leaveController.getLeaveRequests);
router.post('/leave/request', auth, leaveController.requestLeave);
router.patch('/leave/:id/status', auth, leaveController.updateLeaveStatus);
router.get('/leave/balance/:staffId', auth, leaveController.getLeaveBalance);

// ==================== STAFF ROUTES (PARAMETERIZED ROUTES GO LAST) ====================
router.get('/stats', auth, staffController.getStaffStats);
router.get('/', auth, staffController.getAllStaff);
router.post('/', auth, staffController.createStaff);
router.get('/:id', auth, staffController.getStaff);
router.put('/:id', auth, staffController.updateStaff);
router.delete('/:id', auth, staffController.deleteStaff);

// Get attendance for a specific staff member (MUST BE AFTER all other routes)
router.get('/:id/attendance', auth, attendanceController.getStaffAttendanceReport);

module.exports = router;