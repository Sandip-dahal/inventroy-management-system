// src/components/StaffManagementSystem.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  FaUsers, FaCalendarCheck, FaMoneyBillWave, FaUserPlus, 
  FaSearch, FaEdit, FaTrash, FaHome, FaChartLine, FaCog,
  FaTimes, FaCheck, FaClock, FaSave, FaBuilding, FaIdCard,
  FaFileInvoiceDollar, FaCalculator, FaMoneyCheckAlt,FaInfoCircle, FaShieldAlt, FaUsersCog, FaCalendarAlt, 
  FaUserCheck, FaExclamationTriangle, FaSyncAlt
} from 'react-icons/fa';
import { FaListCheck } from 'react-icons/fa6';
import { staffAPI, attendanceAPI, payrollAPI } from '../services/api';
import { staffSettingsAPI } from '../services/api';
import '../styles/StaffManagementSystem.css';
import StaffPerformance from './StaffPerformance';

// Utility function to convert 24-hour time to 12-hour format with AM/PM
const formatTo12Hour = (time24) => {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Validate PAN number format (9 digits)
const validatePanNumber = (pan) => {
  const panRegex = /^\d{9}$/;
  return panRegex.test(pan);
};

// Utility function to check if current time is past closing time
const isPastClosingTime = (currentTime, closingTime) => {
  if (!closingTime || !currentTime) return false;
  
  const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
  const [closingHours, closingMinutes] = closingTime.split(':').map(Number);
  
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const closingTotalMinutes = closingHours * 60 + closingMinutes;
  
  // Handle overnight scenarios (if closing time is before opening time)
  return currentTotalMinutes >= closingTotalMinutes;
};

const StaffManagementSystem = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [staffData, setStaffData] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [payrollSearchTerm, setPayrollSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statsData, setStatsData] = useState({
    totalStaff: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    lateToday: 0,
    halfDayToday: 0,
    pendingPayroll: 0
  });
  
  // Staff Settings state
  const [staffSettings, setStaffSettings] = useState({
    openingTime: '09:00',
    closingTime: '18:00',
    panNumber: '',
    defaultShiftHours: 8,
    overtimeRate: 1.5,
    maxLeavesPerYear: 15,
    requireManagerApprovalForLeave: true
  });
  const [staffSettingsLoading, setStaffSettingsLoading] = useState(false);
  const [staffSettingsError, setStaffSettingsError] = useState(null);
  const [panError, setPanError] = useState('');
  
  // Auto-absent marking state
  const [autoAbsentProcessed, setAutoAbsentProcessed] = useState(false);
  const [autoAbsentLoading, setAutoAbsentLoading] = useState(false);
  
  // Payroll filter states
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Debounce search term for payroll
  const [debouncedPayrollSearchTerm, setDebouncedPayrollSearchTerm] = useState('');
  
  // Initialize empty staff form data
  const emptyStaffForm = {
    name: '',
    position: '',
    email: '',
    phone: '',
    salary: '',
    address: { temporary: '', permanent: '' },
    dateOfBirth: '',
    citizenshipNo: '',
    panNo: '',
    bankAccount: { bankName: '', accountNo: '' },
    emergencyContact: { name: '', relation: '', phone: '' }
  };
  
  const [newStaff, setNewStaff] = useState(emptyStaffForm);
  const [editingStaff, setEditingStaff] = useState(null);
  const [todaysAttendance, setTodaysAttendance] = useState([]);
  
  // Add refs to prevent infinite loops
  const isMountedRef = useRef(true);
  const attendanceFetchRef = useRef(0);
  const autoAbsentRef = useRef(null); // For auto-absent timer
  
  // Get current time in Nepal (24-hour format for input)
  const getCurrentTime = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('ne-NP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kathmandu'
    });
    return formatter.format(now).replace(/\s*(AM|PM)/i, '');
  };
  
  const getTodayDate = () => {
    const now = new Date();
    const offset = 5 * 60 + 45; // Nepal is UTC+5:45
    const localDate = new Date(now.getTime() + offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  const [attendanceForm, setAttendanceForm] = useState({
    staffId: '',
    date: getTodayDate(),
    checkIn: getCurrentTime(),
    checkOut: '',
    status: 'present',
    notes: ''
  });
 
  const [selectedStaffForAttendance, setSelectedStaffForAttendance] = useState(null);
  const [activeStaff, setActiveStaff] = useState([]);
  const [timeError, setTimeError] = useState('');

  // Payroll states
  const [payrolls, setPayrolls] = useState([]);
  const [showGeneratePayrollModal, setShowGeneratePayrollModal] = useState(false);
  const [showPayrollDetailsModal, setShowPayrollDetailsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollForm, setPayrollForm] = useState({
    staffId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    salary: 0,
    date: getTodayDate(),
    time: getCurrentTime(),
    status: 'pending',
    allowance: 0,
    deduction: 0
  });
  const [isEdit, setIsEdit] = useState(false);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollError, setPayrollError] = useState(null);

  // Attendance filter states
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(getTodayDate());
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');
  const [debouncedAttendanceSearchTerm, setDebouncedAttendanceSearchTerm] = useState('');
  const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState('all');

  // Debounce the payroll search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPayrollSearchTerm(payrollSearchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [payrollSearchTerm]);

  // Debounce the attendance search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAttendanceSearchTerm(attendanceSearchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [attendanceSearchTerm]);

  // Auto-absent marking functionality
  const markUnmarkedStaffAsAbsent = useCallback(async () => {
    if (!isMountedRef.current || autoAbsentProcessed || staffSettingsLoading || !staffSettings.closingTime) {
      return;
    }

    try {
      setAutoAbsentLoading(true);
      
      const today = getTodayDate();
      const currentTime = getCurrentTime();
      
      // Check if current time is past closing time
      if (!isPastClosingTime(currentTime, staffSettings.closingTime)) {
        console.log('Current time is not past closing time. Auto-absent not triggered.');
        return;
      }

      // Get staff who don't have attendance marked for today
      const unmarkedStaff = staffData.filter(staff => 
        staff.status === 'active' && 
        !todaysAttendance.some(a => a.staff && a.staff._id === staff._id)
      );

      if (unmarkedStaff.length === 0) {
        console.log('No unmarked staff found for auto-absent marking.');
        setAutoAbsentProcessed(true);
        return;
      }

      console.log(`Auto-marking ${unmarkedStaff.length} staff as absent for ${today}`);

      // Mark all unmarked staff as absent
      const absentPromises = unmarkedStaff.map(staff => 
        attendanceAPI.markAttendance({
          staffId: staff._id,
          date: today,
          status: 'absent',
          notes: `Auto-marked as absent at ${currentTime} (past closing time: ${staffSettings.closingTime})`
        })
      );

      await Promise.all(absentPromises);
      
      // Refresh attendance data
      const attendanceResponse = await attendanceAPI.getAttendance({ date: today });
      if (isMountedRef.current) {
        setTodaysAttendance(attendanceResponse.data.attendance || []);
        
        // Update stats if on dashboard
        if (activeTab === 'dashboard') {
          await fetchDashboardStats();
        }
        
        // Update attendance records if on attendance tab
        if (activeTab === 'attendance') {
          await fetchAttendance();
        }
      }

      console.log(`Successfully auto-marked ${unmarkedStaff.length} staff as absent`);
      
      // Show notification to user
      if (isMountedRef.current) {
        alert(`Auto-absent marking completed: ${unmarkedStaff.length} staff members marked as absent for today.`);
      }

      setAutoAbsentProcessed(true);
      
    } catch (error) {
      console.error('Error in auto-absent marking:', error);
      if (isMountedRef.current) {
        setError(`Auto-absent marking failed: ${error.message}`);
      }
    } finally {
      if (isMountedRef.current) {
        setAutoAbsentLoading(false);
      }
    }
  }, [staffData, todaysAttendance, staffSettings, activeTab, autoAbsentProcessed, staffSettingsLoading]);

  // Check for auto-absent marking every minute when on dashboard or attendance tab
  useEffect(() => {
    if ((activeTab === 'dashboard' || activeTab === 'attendance') && !autoAbsentProcessed && !staffSettingsLoading) {
      const checkInterval = setInterval(() => {
        if (isMountedRef.current) {
          markUnmarkedStaffAsAbsent();
        }
      }, 60000); // Check every minute

      // Also check immediately when switching to these tabs
      const immediateCheck = setTimeout(() => {
        if (isMountedRef.current) {
          markUnmarkedStaffAsAbsent();
        }
      }, 1000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(immediateCheck);
      };
    }
  }, [activeTab, markUnmarkedStaffAsAbsent, autoAbsentProcessed, staffSettingsLoading]);

  // Reset auto-absent processed flag when date changes or staff data changes
  useEffect(() => {
    setAutoAbsentProcessed(false);
  }, [attendanceDate, staffData]);

  // Reset auto-absent processed flag at midnight (new day) and update statuses
useEffect(() => {
  const checkMidnightReset = setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Reset at 00:01 every day
    if (hours === 0 && minutes === 1 && isMountedRef.current) {
      setAutoAbsentProcessed(false);
      setAttendanceDate(getTodayDate());
      // Reset staff statuses to not_marked
      setStaffData(prev => prev.map(staff => ({ ...staff, currentStatus: 'not_marked' })));
      setFilteredStaff(prev => prev.map(staff => ({ ...staff, currentStatus: 'not_marked' })));
      fetchAttendance();
      fetchTodaysAttendance();
      fetchDashboardStats();
      console.log('Auto-absent flag and statuses reset for new day');
    }
  }, 60000); // Check every minute

  return () => clearInterval(checkMidnightReset);
}, []);

  // Memoized function to update staff status
 const updateStaffStatusBasedOnAttendance = useCallback(() => {
  if (!isMountedRef.current || staffData.length === 0) {
    return;
  }

  const updatedStaffData = staffData.map(staff => {
    const attendanceRecord = todaysAttendance.find(a => a.staff && a.staff._id === staff._id);

    if (!attendanceRecord) {
      return { ...staff, currentStatus: 'not_marked' };
    }

    switch (attendanceRecord.status) {
      case 'absent':
        return { ...staff, currentStatus: 'absent' };
      case 'on_leave':
        return { ...staff, currentStatus: 'on_leave' };
      case 'present':
      case 'late':
      case 'half_day':
        if (attendanceRecord.checkIn && attendanceRecord.checkOut) {
          const now = new Date();
          const currentTime = now.getHours() * 60 + now.getMinutes();
          const checkInTime = new Date(attendanceRecord.checkIn);
          const checkOutTime = new Date(attendanceRecord.checkOut);
          const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
          const checkOutMinutes = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();

          if (currentTime >= checkInMinutes && currentTime <= checkOutMinutes) {
            return { ...staff, currentStatus: 'active' };
          } else {
            return { ...staff, currentStatus: 'inactive' };
          }
        } else if (attendanceRecord.checkIn && !attendanceRecord.checkOut) {
          return { ...staff, currentStatus: 'active' };
        } else {
          return { ...staff, currentStatus: 'inactive' };
        }
      default:
        return { ...staff, currentStatus: 'not_marked' };
    }
  });

  // Only update if data actually changed
  const hasChanges = JSON.stringify(updatedStaffData) !== JSON.stringify(staffData);
  if (hasChanges) {
    setStaffData(updatedStaffData);
    setFilteredStaff(updatedStaffData);
  }
}, [staffData, todaysAttendance]);

  // Initial load effect
  useEffect(() => {
    isMountedRef.current = true;
    
 const fetchInitialData = async () => {
  try {
    setLoading(true);
    setError(null);

    // Fetch staff data
    const staffResponse = await staffAPI.getAllStaff();
    if (isMountedRef.current) {
      // Initialize all staff with not_marked status
      const initialStaff = (staffResponse.data.staff || []).map(staff => ({
        ...staff,
        currentStatus: 'not_marked'
      }));
      setStaffData(initialStaff);
      setFilteredStaff(initialStaff);
    }

    // Fetch today's attendance data
    const today = getTodayDate();
    const attendanceResponse = await attendanceAPI.getAttendance({ date: today });
    if (isMountedRef.current) {
      setTodaysAttendance(attendanceResponse.data.attendance || []);
    }

    // Fetch dashboard stats
    await fetchDashboardStats();

    // Fetch staff settings for PAN and times
    await fetchStaffSettings();
  } catch (error) {
    console.error('Error fetching initial data:', error);
    if (isMountedRef.current) {
      setError(error.response?.status === 401 ? 'Please log in to view data' : `Failed to fetch initial data: ${error.message}`);
    }
  } finally {
    if (isMountedRef.current) {
      setLoading(false);
    }
  }
};
    
    fetchInitialData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch staff settings
  const fetchStaffSettings = async () => {
    if (!isMountedRef.current) return;
    
    try {
      setStaffSettingsLoading(true);
      setStaffSettingsError(null);
      setPanError('');
      const response = await staffSettingsAPI.getStaffSettings();
      if (isMountedRef.current) {
        const settings = response.data?.settings || response.settings;
        if (settings) {
          setStaffSettings(settings);
        } else {
          throw new Error('No settings found in response');
        }
      }
    } catch (error) {
      console.error('Error fetching staff settings:', error);
      if (isMountedRef.current) {
        setStaffSettingsError(`Failed to fetch staff settings: ${error.message}. Using default values.`);
        setStaffSettings({
          openingTime: '09:00',
          closingTime: '18:00',
          panNumber: '',
          defaultShiftHours: 8,
          overtimeRate: 1.5,
          maxLeavesPerYear: 15,
          requireManagerApprovalForLeave: true
        });
      }
    } finally {
      if (isMountedRef.current) {
        setStaffSettingsLoading(false);
      }
    }
  };

  // Save staff settings
  const handleSaveStaffSettings = async (e) => {
    e.preventDefault();
    if (!isMountedRef.current) return;
    
    // Validate PAN number before submission
    if (!validatePanNumber(staffSettings.panNumber)) {
      setPanError('Invalid PAN number format. Please enter exactly 9 digits (e.g., 123456789).');
      return;
    }
    
    try {
      setStaffSettingsLoading(true);
      setStaffSettingsError(null);
      setPanError('');
      await staffSettingsAPI.updateStaffSettings(staffSettings);
      alert('Staff settings saved successfully!');
      
      // Reset auto-absent flag when settings are updated (in case closing time changed)
      setAutoAbsentProcessed(false);
    } catch (error) {
      console.error('Error saving staff settings:', error);
      if (isMountedRef.current) {
        const errorMessage = error.response?.data?.message || `Failed to save staff settings: ${error.message}`;
        setStaffSettingsError(errorMessage);
        if (errorMessage.toLowerCase().includes('pan')) {
          setPanError(errorMessage);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setStaffSettingsLoading(false);
      }
    }
  };

  // Manual trigger for auto-absent marking
  const handleManualAutoAbsent = async () => {
    if (window.confirm('Mark all unmarked staff as absent for today? This cannot be undone.')) {
      await markUnmarkedStaffAsAbsent();
    }
  };

  // Search filtering effect for staff (only for dashboard and directory)
  useEffect(() => {
    if ((activeTab === 'dashboard' || activeTab === 'directory') && searchTerm) {
      const filtered = staffData.filter(staff => 
        staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.phone?.includes(searchTerm)
      );
      setFilteredStaff(filtered);
    } else if (activeTab === 'dashboard' || activeTab === 'directory') {
      setFilteredStaff(staffData);
    }
  }, [searchTerm, staffData, activeTab]);

  // Attendance tab effect
  useEffect(() => {
    if (activeTab === 'attendance') {
      // Reset fetch counter
      attendanceFetchRef.current = 0;
      setAutoAbsentProcessed(false); // Reset auto-absent flag when switching to attendance tab
      
      fetchAttendance();
      
      // Get active staff for attendance marking
      const active = staffData.filter(staff => staff.status === 'active');
      setActiveStaff(active);
    } else {
      // Clear attendance data when not on attendance tab
      setAttendanceLoading(false);
    }
  }, [activeTab]);

  // Payroll tab effect - only trigger on tab change
  useEffect(() => {
    if (activeTab === 'payroll') {
      fetchPayrollDataWithFilters();
      // Set active staff for payroll generation
      const active = staffData.filter(staff => staff.status === 'active');
      setActiveStaff(active);
    }
  }, [activeTab]);

  // Refetch payroll when filters change (including debounced search)
  useEffect(() => {
    if (activeTab === 'payroll') {
      // Add a small delay to prevent rapid successive calls
      const timer = setTimeout(() => {
        fetchPayrollDataWithFilters();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedYear, selectedMonth, selectedStatus, debouncedPayrollSearchTerm]);

  // Refetch attendance when date changes
  useEffect(() => {
    if (activeTab === 'attendance') {
      setAutoAbsentProcessed(false); // Reset when date changes
      fetchAttendance();
    }
  }, [attendanceDate]);

  // Auto-update attendance date to current if changed
  useEffect(() => {
    if (activeTab === 'attendance') {
      const checkDateInterval = setInterval(() => {
        const currentDate = getTodayDate();
        if (attendanceDate !== currentDate && isMountedRef.current) {
          setAttendanceDate(currentDate);
          fetchAttendance();
        }
      }, 60000); // Check every minute

      return () => clearInterval(checkDateInterval);
    }
  }, [activeTab, attendanceDate]);

const fetchPayrollDataWithFilters = async () => {
  if (!isMountedRef.current) return;
  try {
    setPayrollLoading(true);
    setPayrollError(null);

    // Prepare params for filtered payrolls
    const params = {
      page: 1,
      limit: 1000,
    };
    if (selectedYear) params.year = selectedYear;
    if (selectedMonth) params.month = selectedMonth;
    if (selectedStatus !== 'all') params.status = selectedStatus;

    console.log('Fetching payroll with params:', params);

    // Fetch filtered payrolls - FIXED: Use the correct API structure
    const payrollsResponse = await payrollAPI.getPayrolls(params);
    
    // Debug the response structure
    console.log('Full payroll response:', payrollsResponse);
    
    if (isMountedRef.current) {
      // Handle different response structures
      const payrollData = payrollsResponse.data || payrollsResponse;
      console.log('Processed payroll data:', payrollData);
      
      if (payrollData && payrollData.payrolls) {
        setPayrolls(payrollData.payrolls || []);
      } else if (Array.isArray(payrollData)) {
        // If response is directly an array
        setPayrolls(payrollData);
      } else {
        console.warn('Unexpected payroll response structure:', payrollData);
        setPayrolls([]);
      }
    }
  } catch (error) {
    console.error('Error fetching payroll data:', error);
    if (isMountedRef.current) {
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          `Failed to fetch payroll data`;
      setPayrollError(errorMessage);
      console.error('Payroll error details:', error.response || error);
      // Set empty array to prevent further errors
      setPayrolls([]);
    }
  } finally {
    if (isMountedRef.current) {
      setPayrollLoading(false);
    }
  }
};

  // Staff settings tab effect
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchStaffSettings();
    }
  }, [activeTab]);

  // Scroll to form when edit form is shown
  useEffect(() => {
    if (showEditForm) {
      const timer = setTimeout(() => {
        const formElement = document.querySelector('.staff-form-container');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [showEditForm]);

  // Update staff status based on attendance for dashboard and directory
  useEffect(() => {
    if ((activeTab === 'dashboard' || activeTab === 'directory') && staffData.length > 0 && todaysAttendance.length > 0) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          updateStaffStatusBasedOnAttendance();
        }
      }, 100); // Small delay to prevent rapid successive calls
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, todaysAttendance, staffData, updateStaffStatusBasedOnAttendance]);

  // Auto-fill salary when staff is selected in payroll form
  useEffect(() => {
    if (payrollForm.staffId && !isEdit) {
      const selected = activeStaff.find(s => s._id === payrollForm.staffId);
      if (selected) {
        setPayrollForm(prev => ({ ...prev, salary: selected.salary || 0 }));
      }
    }
  }, [payrollForm.staffId, activeStaff, isEdit]);

  // Prefill PAN number in new staff form
  useEffect(() => {
    if (showAddForm && staffSettings.panNumber) {
      setNewStaff(prev => ({ ...prev, panNo: staffSettings.panNumber }));
    }
  }, [showAddForm, staffSettings.panNumber]);

  const fetchStaffData = async () => {
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await staffAPI.getAllStaff();
      if (isMountedRef.current) {
        setStaffData(response.data.staff || []);
        setFilteredStaff(response.data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff data:', error);
      if (isMountedRef.current) {
        setError(error.response?.status === 401 ? 'Please log in to view staff data' : `Failed to fetch staff data: ${error.message}`);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchDashboardStats = async () => {
    if (!isMountedRef.current) return;
    
    try {
      setError(null);
      const staffStatsResponse = await staffAPI.getStaffStats();
      const today = getTodayDate();
      
      const attendanceResponse = await attendanceAPI.getAttendance({ date: today });
      const todaysAttendanceRecords = attendanceResponse.data.attendance || [];
      
      const presentToday = todaysAttendanceRecords.filter(a => a.status === 'present').length;
      const absentToday = todaysAttendanceRecords.filter(a => a.status === 'absent').length;
      const onLeaveToday = todaysAttendanceRecords.filter(a => a.status === 'on_leave').length;
      const lateToday = todaysAttendanceRecords.filter(a => a.status === 'late').length;
      const halfDayToday = todaysAttendanceRecords.filter(a => a.status === 'half_day').length;
      
      if (isMountedRef.current) {
        setStatsData({
          totalStaff: staffStatsResponse.data.totalStaff || 0,
          presentToday,
          absentToday,
          onLeaveToday,
          lateToday,
          halfDayToday,
          pendingPayroll: staffStatsResponse.data.pendingPayroll || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      if (isMountedRef.current) {
        setError(error.response?.status === 401 ? 'Please log in to view dashboard stats' : `Failed to fetch dashboard stats: ${error.message}`);
      }
    }
  };

  const fetchTodaysAttendance = async () => {
    if (!isMountedRef.current || attendanceFetchRef.current === 0) return;
    
    try {
      setAttendanceLoading(true);
      setError(null);
      
      // Increment fetch counter to prevent stale calls
      attendanceFetchRef.current += 1;
      const currentFetchId = attendanceFetchRef.current;
      
      const today = getTodayDate();
      const response = await attendanceAPI.getAttendance({ date: today });
      
      // Only update if this is the latest fetch
      if (currentFetchId === attendanceFetchRef.current && isMountedRef.current) {
        setTodaysAttendance(response.data.attendance || []);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      if (isMountedRef.current) {
        setError(`Failed to fetch attendance data: ${error.message}. Please check your connection and try again.`);
      }
    } finally {
      if (isMountedRef.current) {
        setAttendanceLoading(false);
      }
    }
  };

  const fetchAttendance = async () => {
    if (!isMountedRef.current) return;
    
    try {
      setAttendanceLoading(true);
      setError(null);
      
      const response = await attendanceAPI.getAttendance({ date: attendanceDate });
      
      if (isMountedRef.current) {
        setAttendanceRecords(response.data.attendance || []);
        if (attendanceDate === getTodayDate()) {
          setTodaysAttendance(response.data.attendance || []);
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      if (isMountedRef.current) {
        setError(`Failed to fetch attendance data: ${error.message}. Please check your connection and try again.`);
      }
    } finally {
      if (isMountedRef.current) {
        setAttendanceLoading(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'panNo') return; // Prevent editing PAN
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setNewStaff({
        ...newStaff,
        [parent]: {
          ...newStaff[parent],
          [child]: value
        }
      });
    } else {
      setNewStaff({
        ...newStaff,
        [name]: value
      });
    }
  };

  // Handle staff settings input change
  const handleStaffSettingsInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'panNumber') {
      // Remove non-numeric characters and trim to 9 digits
      const numericValue = value.replace(/\D/g, '').slice(0, 9);
      setStaffSettings(prev => ({
        ...prev,
        [name]: numericValue
      }));
      
      // Validate PAN number in real-time
      if (numericValue && !validatePanNumber(numericValue)) {
        setPanError('Invalid PAN number format. Please enter exactly 9 digits (e.g., 123456789).');
      } else {
        setPanError('');
      }
      return;
    }
    
    setStaffSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAttendanceInputChange = (e) => {
    const { name, value } = e.target;
    
    // If status changes, handle field enabling/disabling
    if (name === 'status') {
      setAttendanceForm(prev => {
        const newForm = {
          ...prev,
          [name]: value
        };
        
        // Clear time fields for certain statuses
        if (value === 'absent' || value === 'on_leave') {
          newForm.checkIn = '';
          newForm.checkOut = '';
        } else if (value === 'present') {
          // Auto-fill for present
          newForm.checkIn = staffSettings.openingTime;
          newForm.checkOut = staffSettings.closingTime;
        } else if (value === 'late') {
          // Set current time for checkIn if not already set
          if (!prev.checkIn) {
            newForm.checkIn = getCurrentTime();
          }
        }
        
        return newForm;
      });
      
      // Clear time error when status changes
      if (timeError && (name === 'status' || name === 'checkIn')) {
        setTimeError('');
      }
      return;
    }
    
    // Validate check-out time is after check-in time
    if (name === 'checkOut' && value && attendanceForm.checkIn) {
      const [checkInHours, checkInMinutes] = attendanceForm.checkIn.split(':').map(Number);
      const [checkOutHours, checkOutMinutes] = value.split(':').map(Number);
      
      if (checkOutHours < checkInHours || 
          (checkOutHours === checkInHours && checkOutMinutes <= checkInMinutes)) {
        setTimeError('Check-out time must be after check-in time');
      } else {
        setTimeError('');
      }
    }
    
    setAttendanceForm({
      ...attendanceForm,
      [name]: value
    });
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!isMountedRef.current) return;
    
    // Validate PAN number before submission
    if (!validatePanNumber(newStaff.panNo)) {
      setError('Invalid PAN number format. Please enter exactly 9 digits (e.g., 123456789).');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await staffAPI.createStaff(newStaff);
      alert('Staff member added successfully!');
      
      if (isMountedRef.current) {
        // Reset form to empty values
        setNewStaff(emptyStaffForm);
        setShowAddForm(false);
        fetchStaffData();
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      if (isMountedRef.current) {
        if (error.response?.data?.errors) {
          const errorMessages = error.response.data.errors.join(', ');
          setError(`Validation errors: ${errorMessages}`);
        } else if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError(error.response?.status === 401 ? 
            'Please log in to add staff' : `Failed to add staff member: ${error.message}`);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleEditStaff = (staff) => {
    if (!isMountedRef.current) return;
    
    setEditingStaff(staff);
    setNewStaff({
      name: staff.name,
      position: staff.position,
      email: staff.email,
      phone: staff.phone,
      salary: staff.salary,
      address: staff.address || { temporary: '', permanent: '' },
      dateOfBirth: staff.dateOfBirth ? new Date(staff.dateOfBirth).toISOString().split('T')[0] : '',
      citizenshipNo: staff.citizenshipNo || '',
      panNo: staff.panNo || '',
      bankAccount: staff.bankAccount || { bankName: '', accountNo: '' },
      emergencyContact: staff.emergencyContact || { name: '', relation: '', phone: '' }
    });
    setShowEditForm(true);
    setShowAddForm(false);
    
    // Scroll to the form section
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        const formElement = document.querySelector('.staff-form-container');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!isMountedRef.current) return;
    
    // Validate PAN number before submission
    if (!validatePanNumber(newStaff.panNo)) {
      setError('Invalid PAN number format. Please enter exactly 9 digits (e.g., 123456789).');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await staffAPI.updateStaff(editingStaff._id, newStaff);
      alert('Staff member updated successfully!');
      
      if (isMountedRef.current) {
        setEditingStaff(null);
        setNewStaff(emptyStaffForm);
        setShowEditForm(false);
        fetchStaffData();
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      if (isMountedRef.current) {
        if (error.response?.data?.errors) {
          const errorMessages = error.response.data.errors.join(', ');
          setError(`Validation errors: ${errorMessages}`);
        } else if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError(error.response?.status === 401 ? 
            'Please log in to update staff' : `Failed to update staff member: ${error.message}`);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?') || !isMountedRef.current) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await staffAPI.deleteStaff(id);
      alert('Staff member deleted successfully!');
      
      if (isMountedRef.current) {
        fetchStaffData();
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      if (isMountedRef.current) {
        setError(error.response?.status === 401 ? 'Please log in to delete staff' : 
                 error.response?.data?.message || `Failed to delete staff member: ${error.message}`);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleMarkAttendance = (staff) => {
    if (!isMountedRef.current) return;
    
    setSelectedStaffForAttendance(staff);
    const today = getTodayDate();
    
    // Check if attendance already exists for today
    const existingAttendance = todaysAttendance.find(a => a.staff && a.staff._id === staff._id);
    
    if (existingAttendance) {
      setAttendanceForm({
        staffId: staff._id,
        date: today,
        checkIn: existingAttendance.checkIn ? formatTimeForInput(existingAttendance.checkIn) : getCurrentTime(),
        checkOut: existingAttendance.checkOut ? formatTimeForInput(existingAttendance.checkOut) : '',
        status: existingAttendance.status,
        notes: existingAttendance.notes || ''
      });
    } else {
      setAttendanceForm({
        staffId: staff._id,
        date: today,
        checkIn: getCurrentTime(),
        checkOut: '',
        status: 'present',
        notes: ''
      });
    }
    
    setShowAttendanceModal(true);
    setTimeError('');
  };

  const formatTimeForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat('ne-NP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kathmandu'
    });
    return formatter.format(date);
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    if (!isMountedRef.current) return;
    
    // Validate required fields based on status
    if ((attendanceForm.status === 'absent' || attendanceForm.status === 'on_leave') && !attendanceForm.notes) {
      setError('Notes are mandatory for absence or leave');
      return;
    }
    
    if ((attendanceForm.status === 'late' || attendanceForm.status === 'half_day') && !attendanceForm.notes) {
      setError('Notes are mandatory for late or half day');
      return;
    }
    
    // Validate check-out time
    if (attendanceForm.checkOut && timeError) {
      setError(timeError);
      return;
    }
    
    // Enforce compulsory check-in and check-out for certain statuses
    if (['present', 'late', 'half_day'].includes(attendanceForm.status)) {
      if (!attendanceForm.checkIn || !attendanceForm.checkOut) {
        setError('Both check-in and check-out times are required for this status');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      const formattedData = {
        staffId: attendanceForm.staffId,
        date: attendanceForm.date,
        status: attendanceForm.status,
        notes: attendanceForm.notes
      };
      
      if (attendanceForm.status !== 'absent' && attendanceForm.status !== 'on_leave') {
        if (attendanceForm.checkIn) {
          formattedData.checkIn = attendanceForm.checkIn;
        }
        
        if (attendanceForm.checkOut) {
          formattedData.checkOut = attendanceForm.checkOut;
        }
      }
      
      await attendanceAPI.markAttendance(formattedData);
      alert('Attendance marked successfully!');
      
      if (isMountedRef.current) {
        setShowAttendanceModal(false);
        fetchTodaysAttendance();
        if (activeTab === 'attendance') {
          fetchAttendance();
        }
        fetchDashboardStats(); // Refresh dashboard stats
        
        // Reset auto-absent flag since attendance was manually marked
        setAutoAbsentProcessed(false);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      if (isMountedRef.current) {
        setError(error.response?.data?.message || `Failed to mark attendance: ${error.message}`);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Fixed handler for payroll search - prevents focus loss
  const handlePayrollSearch = (e) => {
    setPayrollSearchTerm(e.target.value);
  };

  const handleAddStaffButtonClick = () => {
    if (!isMountedRef.current) return;
    
    // Reset form to empty values
    setNewStaff({ ...emptyStaffForm, panNo: staffSettings.panNumber });
    setShowAddForm(!showAddForm);
    setShowEditForm(false);
    setEditingStaff(null);
  };

  // Calculate operating duration for display
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    // Handle overnight operations
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  // Payroll handlers
  const handleOpenGeneratePayroll = () => {
    setIsEdit(false);
    setPayrollForm({
      staffId: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      salary: 0,
      date: getTodayDate(),
      time: getCurrentTime(),
      status: 'pending',
      allowance: 0,
      deduction: 0
    });
    setShowGeneratePayrollModal(true);
  };

  const handleEditPayroll = () => {
    setShowPayrollDetailsModal(false);
    setPayrollForm({
      staffId: selectedPayroll.staff._id,
      month: selectedPayroll.month,
      year: selectedPayroll.year,
      salary: selectedPayroll.basicSalary,
      date: selectedPayroll.date || getTodayDate(),
      time: selectedPayroll.time || getCurrentTime(),
      status: selectedPayroll.status,
      allowance: selectedPayroll.allowance || 0,
      deduction: selectedPayroll.deduction || 0
    });
    setIsEdit(true);
    setShowGeneratePayrollModal(true);
  };

  const handlePayrollInputChange = (e) => {
    const { name, value } = e.target;
    setPayrollForm(prev => ({
      ...prev,
      [name]: name === 'month' || name === 'year' ? parseInt(value) || 0 :
              name === 'allowance' || name === 'deduction' || name === 'salary' ? parseFloat(value) || 0 : value
    }));
  };

const handleGeneratePayroll = async (e, retryCount = 0) => {
  e.preventDefault();
  if (!payrollForm.staffId) {
    setPayrollError('Please select a staff member.');
    return;
  }
  if (!payrollForm.month || !payrollForm.year) {
    setPayrollError('Please select a valid month and year.');
    return;
  }
  if (!payrollForm.salary || isNaN(parseFloat(payrollForm.salary))) {
    setPayrollError('Please provide a valid salary amount.');
    return;
  }
  
  console.log('Current payrollForm state:', payrollForm);
  
  try {
    setPayrollLoading(true);
    setPayrollError(null);
    let response;
    
    if (isEdit) {
      response = await payrollAPI.updatePayroll(selectedPayroll._id, payrollForm);
      alert('Payroll updated successfully!');
    } else {
      // Enhanced duplicate check with better error handling
      const checkResponse = await payrollAPI.checkPayrollExists({
        staffId: payrollForm.staffId,
        month: payrollForm.month,
        year: payrollForm.year
      });
      
      console.log('Payroll check response:', checkResponse);
      
      if (checkResponse.exists) {
        const staffName = activeStaff.find(s => s._id === payrollForm.staffId)?.name || 'this staff member';
        setPayrollError(`Payroll already exists for ${staffName} for ${payrollForm.month}/${payrollForm.year}.`);
        return;
      }

      console.log('Sending payroll data:', payrollForm);
      
      response = await payrollAPI.generatePayroll(payrollForm);
      alert('Payroll generated successfully!');
    }
    
    setShowGeneratePayrollModal(false);
    setIsEdit(false);
    await fetchPayrollDataWithFilters();
  } catch (error) {
    console.error('Error generating/updating payroll:', error);
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Failed to generate payroll. Please check the console for details.';
    
    // Enhanced retry logic
    if (retryCount < 1 && (errorMessage.includes('already exists') || errorMessage.includes('race condition') || errorMessage.includes('index conflict'))) {
      console.log('Retrying generatePayroll due to possible race condition...');
      // Add a small delay before retry
      await new Promise(resolve => setTimeout(resolve, 500));
      return handleGeneratePayroll(e, retryCount + 1);
    }
    
    setPayrollError(errorMessage);
  } finally {
    setPayrollLoading(false);
  }
};
  const handleViewPayroll = (payroll) => {
    setSelectedPayroll(payroll);
    setShowPayrollDetailsModal(true);
  };

  const tabItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
    { id: 'directory', label: 'Staff Directory', icon: <FaUsers /> },
    { id: 'attendance', label: 'Attendance', icon: <FaCalendarCheck /> },
    { id: 'payroll', label: 'Payroll', icon: <FaMoneyBillWave /> },
    { id: 'performance', label: 'Performance', icon: <FaChartLine /> },
    { id: 'settings', label: 'Staff Settings', icon: <FaCog /> }
  ];

  // Generate years from 2020 to 2026
  const years = Array.from({ length: 7 }, (_, i) => 2020 + i);

  // Generate months
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleString('default', { month: 'long' })
  }));

  // Check if header actions should be shown
  const shouldShowHeaderActions = ['dashboard', 'directory'].includes(activeTab);

  // Client-side filtering for payroll records
  const filteredPayrolls = useMemo(() => {
    if (!debouncedPayrollSearchTerm.trim()) return payrolls;
    const term = debouncedPayrollSearchTerm.toLowerCase().trim();
    return payrolls.filter(payroll => 
      payroll.staff?.name.toLowerCase().includes(term)
    );
  }, [payrolls, debouncedPayrollSearchTerm]);

  // Compute payroll summary based on filtered payrolls
  const computedPayrollSummary = useMemo(() => {
    return filteredPayrolls.reduce((acc, p) => {
      acc.totalStaff += 1;
      acc.totalBasicSalary += p.basicSalary || 0;
      acc.totalAllowances += p.allowance || 0;
      acc.totalDeductions += p.deduction || 0;
      if (p.status === 'pending') acc.pending += 1;
      return acc;
    }, { totalStaff: 0, totalBasicSalary: 0, totalAllowances: 0, totalDeductions: 0, pending: 0 });
  }, [filteredPayrolls]);

  // Client-side filtering for attendance records
  const filteredAttendanceRecords = useMemo(() => {
    const term = debouncedAttendanceSearchTerm.toLowerCase().trim();
    return attendanceRecords.filter(record => {
      const nameMatch = !term || record.staff?.name.toLowerCase().includes(term);
      const statusMatch = selectedAttendanceStatus === 'all' || record.status === selectedAttendanceStatus;
      return nameMatch && statusMatch;
    });
  }, [attendanceRecords, debouncedAttendanceSearchTerm, selectedAttendanceStatus]);

  // Get number of unmarked staff for today
  const unmarkedStaffCount = useMemo(() => {
    return activeStaff.filter(staff => 
      !todaysAttendance.some(a => a.staff && a.staff._id === staff._id)
    ).length;
  }, [activeStaff, todaysAttendance]);

  // Check if auto-absent should be active
  const shouldShowAutoAbsent = useMemo(() => {
    return staffSettings.closingTime && 
           isPastClosingTime(getCurrentTime(), staffSettings.closingTime) && 
           unmarkedStaffCount > 0 && 
           !autoAbsentProcessed;
  }, [staffSettings.closingTime, unmarkedStaffCount, autoAbsentProcessed]);

  // Refresh attendance button handler
  const handleRefreshAttendance = () => {
    setAttendanceDate(getTodayDate());
    setAttendanceSearchTerm('');
    setSelectedAttendanceStatus('all');
    fetchAttendance();
  };

  return (
    <div className="staff-management-system">
      <div className="staff-header">
        <div className="staff-header-left">
          <h2>Staff Management</h2>
        </div>
        {shouldShowHeaderActions && (
          <div className="staff-header-actions">
            <div className="staff-search-box">
              <FaSearch className="staff-search-icon" />
              <input 
                type="text" 
                placeholder="Search staff..." 
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <button 
              className="staff-btn staff-btn-primary"
              onClick={handleAddStaffButtonClick}
              disabled={loading}
            >
              <FaUserPlus /> {showAddForm ? 'Cancel' : 'Add Staff'}
            </button>
          </div>
        )}
      </div>
      
      <div className="staff-tab-nav">
        {tabItems.map(tab => (
          <button
            key={tab.id}
            className={`staff-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            disabled={loading}
          >
            <span className="staff-tab-icon">{tab.icon}</span>
            <span className="staff-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      
      <div className="staff-tab-content">
        {loading && <div className="staff-loading">Loading...</div>}
        {error && <div className="staff-error">{error}</div>}
        
        {activeTab === 'dashboard' && (
          <>
            {/* Auto-Absent Status Indicator */}
            {shouldShowAutoAbsent && (
              <div className="staff-info-display" style={{ 
                backgroundColor: '#fff3cd', 
                borderColor: '#ffeaa7', 
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem'
              }}>
                <div>
                  <FaClock style={{ marginRight: '0.5rem', color: '#856404' }} />
                  <strong>Auto-Absent Alert:</strong> {unmarkedStaffCount} staff member(s) will be automatically marked absent in the next minute past closing time ({formatTo12Hour(staffSettings.closingTime)}).
                </div>
                <button 
                  className="staff-btn staff-btn-warning"
                  onClick={handleManualAutoAbsent}
                  disabled={autoAbsentLoading}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                >
                  {autoAbsentLoading ? 'Processing...' : 'Mark Now'}
                </button>
              </div>
            )}
            
            {autoAbsentProcessed && (
              <div className="staff-info-display" style={{ 
                backgroundColor: '#d4edda', 
                borderColor: '#c3e6cb', 
                marginBottom: '1rem',
                padding: '0.75rem'
              }}>
                <FaCheck style={{ marginRight: '0.5rem', color: '#155724' }} />
                <strong>Auto-Absent Completed:</strong> All unmarked staff have been marked as absent for today.
              </div>
            )}
            
            <div className="staff-dashboard-cards">
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-primary">
                  <FaUsers />
                </div>
                <div className="staff-stat-info">
                  <h3>{statsData.totalStaff}</h3>
                  <p>Total Staff</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-success">
                  <FaCalendarCheck />
                </div>
                <div className="staff-stat-info">
                  <h3>{statsData.presentToday}</h3>
                  <p>Present Today</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-danger">
                  <FaCalendarCheck />
                </div>
                <div className="staff-stat-info">
                  <h3>{statsData.absentToday}</h3>
                  <p>Absent Today</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-warning">
                  <FaCalendarCheck />
                </div>
                <div className="staff-stat-info">
                  <h3>{statsData.onLeaveToday}</h3>
                  <p>On Leave</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-warning">
                  <FaClock />
                </div>
                <div className="staff-stat-info">
                  <h3>{statsData.lateToday}</h3>
                  <p>Late Today</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-warning">
                  <FaClock />
                </div>
                <div className="staff-stat-info">
                  <h3>{statsData.halfDayToday}</h3>
                  <p>Half Day</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-danger">
                  <FaMoneyBillWave />
                </div>
                <div className="staff-stat-info">
                  <h3>{statsData.pendingPayroll}</h3>
                  <p>Pending Payroll</p>
                </div>
              </div>
              {/* Unmarked Staff Card */}
              <div className="staff-card staff-stat-card">
                <div className={`staff-stat-icon ${unmarkedStaffCount > 0 ? 'staff-bg-danger' : 'staff-bg-success'}`}>
                  <FaUsers />
                </div>
                <div className="staff-stat-info">
                  <h3>{unmarkedStaffCount}</h3>
                  <p>Unmarked Today</p>
                  {unmarkedStaffCount > 0 && (
                    <small style={{ display: 'block', fontSize: '0.75rem', color: '#dc3545' }}>
                      Will be auto-marked as absent
                    </small>
                  )}
                </div>
              </div>
            </div>
            
            <div className="staff-table-container">
              <div className="staff-table-header">
                <h3>Recent Staff</h3>
                <div>Today: {new Date().toLocaleDateString('ne-NP', { timeZone: 'Asia/Kathmandu' })}</div>
              </div>
              
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Position</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.slice(0, 5).map(staff => (
                    <tr key={staff._id}>
                      <td>{staff.name}</td>
                      <td>{staff.position}</td>
                      <td>{staff.email}</td>
                      <td>{staff.phone}</td>
                      <td>
                        <span className={`staff-status staff-status-${staff.currentStatus || staff.status || 'active'}`}>
                          {staff.currentStatus ? staff.currentStatus.replace('_', ' ') : (staff.status || 'Active')}
                        </span>
                      </td>
                      <td className="staff-action-buttons">
                        <button 
                          className="staff-action-btn staff-edit-btn"
                          onClick={() => handleEditStaff(staff)}
                          disabled={loading}
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="staff-action-btn staff-delete-btn"
                          onClick={() => handleDeleteStaff(staff._id)}
                          disabled={loading}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {showAddForm && (
              <div className="staff-form-container">
                <h3>Add New Staff Member</h3>
                <form onSubmit={handleAddStaff}>
                  <div className="staff-form-grid">
                    <div className="staff-form-group">
                      <label htmlFor="name">Full Name *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={newStaff.name}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter full name"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="position">Position *</label>
                      <select
                        id="position"
                        name="position"
                        value={newStaff.position}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        required
                        disabled={loading}
                      >
                        <option value="">Select position</option>
                        <option value="Store Manager">Store Manager</option>
                        <option value="Sales Associate">Sales Associate</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Inventory Manager">Inventory Manager</option>
                        <option value="Visual Merchandiser">Visual Merchandiser</option>
                      </select>
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="email">Email Address *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={newStaff.email}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter email address"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="phone">Phone Number *</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={newStaff.phone}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="+977 98XXXXXXX"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="salary">Salary (NPR) *</label>
                      <input
                        type="number"
                        id="salary"
                        name="salary"
                        value={newStaff.salary}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter salary amount"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="dateOfBirth">Date of Birth *</label>
                      <input
                        type="date"
                        id="dateOfBirth"
                        name="dateOfBirth"
                        value={newStaff.dateOfBirth}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="citizenshipNo">Citizenship Number *</label>
                      <input
                        type="text"
                        id="citizenshipNo"
                        name="citizenshipNo"
                        value={newStaff.citizenshipNo}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter citizenship number"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="panNo">PAN Number *</label>
                      <input
                        type="text"
                        id="panNo"
                        name="panNo"
                        value={newStaff.panNo}
                        className={`staff-form-control ${error && error.includes('PAN') ? 'staff-form-control-error' : ''}`}
                        placeholder="Enter PAN number (e.g., 123456789)"
                        required
                        disabled
                        readOnly
                      />
                      <small className="form-help-text">Format: 123456789 (exactly 9 digits) - Auto-filled from settings</small>
                      {error && error.includes('PAN') && (
                        <div className="staff-error" style={{fontSize: '12px', marginTop: '5px'}}>{error}</div>
                      )}
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="address.permanent">Permanent Address *</label>
                      <input
                        type="text"
                        id="address.permanent"
                        name="address.permanent"
                        value={newStaff.address.permanent}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter permanent address"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="address.temporary">Temporary Address</label>
                      <input
                        type="text"
                        id="address.temporary"
                        name="address.temporary"
                        value={newStaff.address.temporary}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter temporary address"
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="bankAccount.bankName">Bank Name</label>
                      <input
                        type="text"
                        id="bankAccount.bankName"
                        name="bankAccount.bankName"
                        value={newStaff.bankAccount.bankName}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter bank name"
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="bankAccount.accountNo">Account Number</label>
                      <input
                        type="text"
                        id="bankAccount.accountNo"
                        name="bankAccount.accountNo"
                        value={newStaff.bankAccount.accountNo}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter account number"
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="emergencyContact.name">Emergency Contact Name *</label>
                      <input
                        type="text"
                        id="emergencyContact.name"
                        name="emergencyContact.name"
                        value={newStaff.emergencyContact.name}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter emergency contact name"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="emergencyContact.relation">Emergency Contact Relation *</label>
                      <input
                        type="text"
                        id="emergencyContact.relation"
                        name="emergencyContact.relation"
                        value={newStaff.emergencyContact.relation}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter relation (e.g., Father, Mother)"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="emergencyContact.phone">Emergency Contact Phone *</label>
                      <input
                        type="tel"
                        id="emergencyContact.phone"
                        name="emergencyContact.phone"
                        value={newStaff.emergencyContact.phone}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter emergency contact phone"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="staff-form-actions">
                    <button 
                      type="button" 
                      className="staff-btn staff-btn-secondary"
                      onClick={() => setShowAddForm(false)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="staff-btn staff-btn-primary" disabled={loading || (error && error.includes('PAN'))}>
                      {loading ? 'Adding...' : 'Add Staff Member'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {showEditForm && (
              <div className="staff-form-container">
                <h3>Edit Staff Member: {editingStaff?.name}</h3>
                <form onSubmit={handleUpdateStaff}>
                  <div className="staff-form-grid">
                    <div className="staff-form-group">
                      <label htmlFor="edit-name">Full Name *</label>
                      <input
                        type="text"
                        id="edit-name"
                        name="name"
                        value={newStaff.name}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter full name"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-position">Position *</label>
                      <select
                        id="edit-position"
                        name="position"
                        value={newStaff.position}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        required
                        disabled={loading}
                      >
                        <option value="">Select position</option>
                        <option value="Store Manager">Store Manager</option>
                        <option value="Sales Associate">Sales Associate</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Inventory Manager">Inventory Manager</option>
                        <option value="Visual Merchandiser">Visual Merchandiser</option>
                      </select>
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-email">Email Address *</label>
                      <input
                        type="email"
                        id="edit-email"
                        name="email"
                        value={newStaff.email}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter email address"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-phone">Phone Number *</label>
                      <input
                        type="tel"
                        id="edit-phone"
                        name="phone"
                        value={newStaff.phone}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="+977 98XXXXXXX"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-salary">Salary (NPR) *</label>
                      <input
                        type="number"
                        id="edit-salary"
                        name="salary"
                        value={newStaff.salary}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter salary amount"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-dateOfBirth">Date of Birth *</label>
                      <input
                        type="date"
                        id="edit-dateOfBirth"
                        name="dateOfBirth"
                        value={newStaff.dateOfBirth}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-citizenshipNo">Citizenship Number *</label>
                      <input
                        type="text"
                        id="edit-citizenshipNo"
                        name="citizenshipNo"
                        value={newStaff.citizenshipNo}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter citizenship number"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-panNo">PAN Number *</label>
                      <input
                        type="text"
                        id="edit-panNo"
                        name="panNo"
                        value={newStaff.panNo}
                        onChange={handleInputChange}
                        className={`staff-form-control ${error && error.includes('PAN') ? 'staff-form-control-error' : ''}`}
                        placeholder="Enter PAN number (e.g., 123456789)"
                        required
                        disabled={loading}
                        maxLength="9"
                        inputMode="numeric"
                        pattern="\d{9}"
                      />
                      <small className="form-help-text">Format: 123456789 (exactly 9 digits)</small>
                      {error && error.includes('PAN') && (
                        <div className="staff-error" style={{fontSize: '12px', marginTop: '5px'}}>{error}</div>
                      )}
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-address.permanent">Permanent Address *</label>
                      <input
                        type="text"
                        id="edit-address.permanent"
                        name="address.permanent"
                        value={newStaff.address.permanent}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter permanent address"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-address.temporary">Temporary Address</label>
                      <input
                        type="text"
                        id="edit-address.temporary"
                        name="address.temporary"
                        value={newStaff.address.temporary}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter temporary address"
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-bankAccount.bankName">Bank Name</label>
                      <input
                        type="text"
                        id="edit-bankAccount.bankName"
                        name="bankAccount.bankName"
                        value={newStaff.bankAccount.bankName}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter bank name"
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-bankAccount.accountNo">Account Number</label>
                      <input
                        type="text"
                        id="edit-bankAccount.accountNo"
                        name="bankAccount.accountNo"
                        value={newStaff.bankAccount.accountNo}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter account number"
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-emergencyContact.name">Emergency Contact Name *</label>
                      <input
                        type="text"
                        id="edit-emergencyContact.name"
                        name="emergencyContact.name"
                        value={newStaff.emergencyContact.name}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter emergency contact name"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-emergencyContact.relation">Emergency Contact Relation *</label>
                      <input
                        type="text"
                        id="edit-emergencyContact.relation"
                        name="emergencyContact.relation"
                        value={newStaff.emergencyContact.relation}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter relation (e.g., Father, Mother)"
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="staff-form-group">
                      <label htmlFor="edit-emergencyContact.phone">Emergency Contact Phone *</label>
                      <input
                        type="tel"
                        id="edit-emergencyContact.phone"
                        name="emergencyContact.phone"
                        value={newStaff.emergencyContact.phone}
                        onChange={handleInputChange}
                        className="staff-form-control"
                        placeholder="Enter emergency contact phone"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="staff-form-actions">
                    <button 
                      type="button" 
                      className="staff-btn staff-btn-secondary"
                      onClick={() => {
                        if (isMountedRef.current) {
                          setShowEditForm(false);
                          setEditingStaff(null);
                          setNewStaff(emptyStaffForm);
                        }
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="staff-btn staff-btn-primary" disabled={loading || (error && error.includes('PAN'))}>
                      {loading ? 'Updating...' : 'Update Staff Member'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'directory' && (
          <div className="staff-table-container">
            <div className="staff-table-header">
              <h3>Staff Directory</h3>
              <span>Total: {filteredStaff.length} staff members</span>
            </div>
            
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(staff => (
                  <tr key={staff._id}>
                    <td>{staff.name}</td>
                    <td>{staff.position}</td>
                    <td>{staff.email}</td>
                    <td>{staff.phone}</td>
                    <td>NPR {staff.salary?.toLocaleString() || '0'}</td>
                    <td>
                      <span className={`staff-status staff-status-${staff.currentStatus || staff.status || 'active'}`}>
                        {staff.currentStatus ? staff.currentStatus.replace('_', ' ') : (staff.status || 'Active')}
                      </span>
                    </td>
                    <td className="staff-action-buttons">
                      <button 
                        className="staff-action-btn staff-edit-btn"
                        onClick={() => handleEditStaff(staff)}
                        disabled={loading}
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="staff-action-btn staff-delete-btn"
                        onClick={() => handleDeleteStaff(staff._id)}
                        disabled={loading}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'attendance' && (
          <div className="staff-attendance-container">
            {/* Auto-Absent Status Indicator for Attendance Tab */}
            {shouldShowAutoAbsent && (
              <div className="staff-info-display" style={{ 
                backgroundColor: '#fff3cd', 
                borderColor: '#ffeaa7', 
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem'
              }}>
                <div>
                  <FaClock style={{ marginRight: '0.5rem', color: '#856404' }} />
                  <strong>Auto-Absent Alert:</strong> {unmarkedStaffCount} staff member(s) will be automatically marked absent in the next minute past closing time ({formatTo12Hour(staffSettings.closingTime)}).
                </div>
                <button 
                  className="staff-btn staff-btn-warning"
                  onClick={handleManualAutoAbsent}
                  disabled={autoAbsentLoading}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                >
                  {autoAbsentLoading ? 'Processing...' : 'Mark Now'}
                </button>
              </div>
            )}
            
            {autoAbsentProcessed && (
              <div className="staff-info-display" style={{ 
                backgroundColor: '#d4edda', 
                borderColor: '#c3e6cb', 
                marginBottom: '1rem',
                padding: '0.75rem'
              }}>
                <FaCheck style={{ marginRight: '0.5rem', color: '#155724' }} />
                <strong>Auto-Absent Completed:</strong> All unmarked staff have been marked as absent for today.
              </div>
            )}
            
            <div className="staff-table-header">
              <h3>Attendance for {new Date(attendanceDate).toLocaleDateString('ne-NP', { timeZone: 'Asia/Kathmandu' })}</h3>
              {attendanceDate === getTodayDate() && staffSettings.closingTime && (
                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '0.5rem' }}>
                  Closing Time: {formatTo12Hour(staffSettings.closingTime)} | 
                  Current Time: {formatTo12Hour(getCurrentTime())}
                  {isPastClosingTime(getCurrentTime(), staffSettings.closingTime) && (
                    <span style={{ color: '#dc3545', fontWeight: 'bold' }}> (Past closing time)</span>
                  )}
                </div>
              )}
            </div>

            <div className="staff-attendance-filters" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div className="staff-form-group">
                <label htmlFor="attendanceDate">Date</label>
                <input
                  type="date"
                  id="attendanceDate"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="staff-form-control"
                  disabled={attendanceLoading}
                />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ position: 'relative' }}>
                  <FaSearch className="staff-search-icon" style={{ 
                    position: 'absolute', 
                    left: '10px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none' 
                  }} />
                  <input 
                    type="text" 
                    placeholder="Search by staff name..." 
                    value={attendanceSearchTerm}
                    onChange={e => setAttendanceSearchTerm(e.target.value)}
                    className="staff-form-control"
                    style={{ paddingLeft: '35px' }}
                    disabled={attendanceLoading}
                  />
                </div>
              </div>
              <div className="staff-form-group">
                <label htmlFor="attendanceStatus">Status</label>
                <select
                  id="attendanceStatus"
                  value={selectedAttendanceStatus}
                  onChange={e => setSelectedAttendanceStatus(e.target.value)}
                  className="staff-form-control"
                  disabled={attendanceLoading}
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="on_leave">On Leave</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>
            </div>
            
            <div className="staff-attendance-summary" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '1rem', 
              marginBottom: '1rem' 
            }}>
              <div className="staff-attendance-summary-item">
                <span className="staff-attendance-label">Total Staff:</span>
                <span className="staff-attendance-value">{activeStaff.length}</span>
              </div>
              <div className="staff-attendance-summary-item">
                <span className="staff-attendance-label">Present:</span>
                <span className="staff-attendance-value">
                  {attendanceRecords.filter(a => a.status === 'present').length}
                </span>
              </div>
              <div className="staff-attendance-summary-item">
                <span className="staff-attendance-label">Absent:</span>
                <span className="staff-attendance-value">
                  {attendanceRecords.filter(a => a.status === 'absent').length}
                </span>
              </div>
              <div className="staff-attendance-summary-item">
                <span className="staff-attendance-label">On Leave:</span>
                <span className="staff-attendance-value">
                  {attendanceRecords.filter(a => a.status === 'on_leave').length}
                </span>
              </div>
              <div className="staff-attendance-summary-item">
                <span className="staff-attendance-label">Late:</span>
                <span className="staff-attendance-value">
                  {attendanceRecords.filter(a => a.status === 'late').length}
                </span>
              </div>
              <div className="staff-attendance-summary-item">
                <span className="staff-attendance-label">Half Day:</span>
                <span className="staff-attendance-value">
                  {attendanceRecords.filter(a => a.status === 'half_day').length}
                </span>
              </div>
              {attendanceDate === getTodayDate() && (
                <div className="staff-attendance-summary-item">
                  <span className="staff-attendance-label">Unmarked:</span>
                  <span className={`staff-attendance-value ${unmarkedStaffCount > 0 ? 'text-danger' : ''}`}>
                    {unmarkedStaffCount}
                    {unmarkedStaffCount > 0 && shouldShowAutoAbsent && ' (Auto-absent pending)'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="staff-attendance-actions" style={{ marginBottom: '1rem' }}>
              <button 
                className="staff-btn staff-btn-primary"
                onClick={handleRefreshAttendance}
                disabled={attendanceLoading || loading}
              >
                <FaClock /> {attendanceLoading ? 'Loading...' : 'Refresh Attendance'}
              </button>
              {attendanceDate === getTodayDate() && unmarkedStaffCount > 0 && (
                <button 
                  className="staff-btn staff-btn-warning"
                  onClick={handleManualAutoAbsent}
                  disabled={autoAbsentLoading || autoAbsentProcessed}
                  style={{ marginLeft: '0.5rem' }}
                >
                  <FaUsers /> Mark Unmarked as Absent ({unmarkedStaffCount})
                </button>
              )}
            </div>
            
            {attendanceLoading && <div className="staff-loading">Loading attendance...</div>}
            
            <div className="staff-table-container">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Position</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendanceRecords.length > 0 ? (
                    filteredAttendanceRecords.map(record => (
                      <tr key={record._id}>
                        <td>{record.staff?.name}</td>
                        <td>{record.staff?.position}</td>
                        <td>{record.checkIn ? formatTo12Hour(formatTimeForInput(record.checkIn)) : '-'}</td>
                        <td>{record.checkOut ? formatTo12Hour(formatTimeForInput(record.checkOut)) : '-'}</td>
                        <td>
                          <div>
                            <span className={`staff-status staff-status-${record.status}`}>
                              {record.status.replace('_', ' ')}
                            </span>
                            {record.notes?.includes('Auto-marked') && (
                              <small style={{ 
                                display: 'block', 
                                fontSize: '0.75rem', 
                                color: '#6c757d',
                                fontStyle: 'italic'
                              }}>
                                (Auto)
                              </small>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                        {attendanceLoading ? 'Loading attendance records...' : 
                         'No attendance records for today. Click "Mark Attendance" below to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {attendanceDate === getTodayDate() ? (
              <div className="staff-attendance-mark-section">
                <h4>Mark Attendance for Staff</h4>
                <div className="staff-attendance-staff-list" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  gap: '1rem', 
                  marginTop: '1rem' 
                }}>
                  {activeStaff.map(staff => {
                    const hasAttendance = todaysAttendance.some(a => a.staff && a.staff._id === staff._id);
                    const isAutoAbsentPending = !hasAttendance && shouldShowAutoAbsent;
                    return (
                      <div key={staff._id} className="staff-attendance-staff-item" style={{ 
                        padding: '1rem', 
                        border: '1px solid #dee2e6', 
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div className="staff-attendance-staff-info">
                          <span className="staff-attendance-staff-name" style={{ fontWeight: 'bold' }}>
                            {staff.name}
                          </span>
                          <span className="staff-attendance-staff-position" style={{ 
                            display: 'block', 
                            fontSize: '0.9em', 
                            color: '#6c757d' 
                          }}>
                            {staff.position}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                          <div className="staff-attendance-staff-status">
                            {hasAttendance ? (
                              <span className="staff-status staff-status-present">Marked</span>
                            ) : isAutoAbsentPending ? (
                              <span className="staff-status staff-status-warning" style={{ 
                                animation: 'pulse 2s infinite',
                                backgroundColor: '#fff3cd',
                                color: '#856404',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.8em'
                              }}>
                                Auto-Absent Pending
                              </span>
                            ) : (
                              <span className="staff-status staff-status-absent">Not Marked</span>
                            )}
                          </div>
                          <button 
                            className="staff-btn staff-btn-primary"
                            onClick={() => handleMarkAttendance(staff)}
                            disabled={loading}
                            style={{ 
                              marginTop: '0.5rem',
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            {hasAttendance ? 'Edit' : 'Mark'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="staff-info-display" style={{ 
                padding: '1rem', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px', 
                marginTop: '1rem',
                textAlign: 'center'
              }}>
                <p>Viewing historical attendance. Marking is only available for today's date.</p>
              </div>
            )}
            
            {showAttendanceModal && (
              <div className="staff-modal" style={{ 
                display: 'flex', 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                justifyContent: 'center', 
                alignItems: 'center', 
                zIndex: 1000 
              }}>
                <div className="staff-modal-content" style={{ 
                  background: 'white', 
                  padding: '2rem', 
                  borderRadius: '8px', 
                  maxWidth: '500px', 
                  width: '90%', 
                  maxHeight: '90%', 
                  overflowY: 'auto' 
                }}>
                  <div className="staff-modal-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem' 
                  }}>
                    <h3>Mark Attendance for {selectedStaffForAttendance?.name}</h3>
                    <button 
                      className="staff-modal-close"
                      onClick={() => setShowAttendanceModal(false)}
                      disabled={loading}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        fontSize: '1.5rem', 
                        cursor: 'pointer' 
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmitAttendance}>
                    <div className="staff-form-grid" style={{ display: 'grid', gap: '1rem' }}>
                      <div className="staff-form-group">
                        <label htmlFor="date">Date</label>
                        <input
                          type="date"
                          id="date"
                          name="date"
                          value={attendanceForm.date}
                          className="staff-form-control staff-form-control-disabled"
                          readOnly
                          disabled
                          style={{ backgroundColor: '#f8f9fa' }}
                        />
                      </div>
                      
                      <div className="staff-form-group">
                        <label htmlFor="status">Status *</label>
                        <select
                          id="status"
                          name="status"
                          value={attendanceForm.status}
                          onChange={handleAttendanceInputChange}
                          className="staff-form-control"
                          required
                          disabled={loading}
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="on_leave">On Leave</option>
                          <option value="half_day">Half Day</option>
                        </select>
                      </div>
                      
                      <div className="staff-form-group">
                        <label htmlFor="checkIn">Check In Time</label>
                        <input
                          type="time"
                          id="checkIn"
                          name="checkIn"
                          value={attendanceForm.checkIn}
                          onChange={handleAttendanceInputChange}
                          className="staff-form-control"
                          disabled={attendanceForm.status === 'absent' || attendanceForm.status === 'on_leave' || loading}
                          required={['present', 'late', 'half_day'].includes(attendanceForm.status)}
                        />
                        <small className="form-help-text" style={{ fontSize: '0.8em', color: '#6c757d' }}>
                          {attendanceForm.checkIn ? formatTo12Hour(attendanceForm.checkIn) : 'Select time'}
                        </small>
                      </div>
                      
                      <div className="staff-form-group">
                        <label htmlFor="checkOut">Check Out Time</label>
                        <input
                          type="time"
                          id="checkOut"
                          name="checkOut"
                          value={attendanceForm.checkOut}
                          onChange={handleAttendanceInputChange}
                          className="staff-form-control"
                          disabled={attendanceForm.status === 'absent' || attendanceForm.status === 'on_leave' || loading}
                          required={['present', 'late', 'half_day'].includes(attendanceForm.status)}
                        />
                        <small className="form-help-text" style={{ fontSize: '0.8em', color: '#6c757d' }}>
                          {attendanceForm.checkOut ? formatTo12Hour(attendanceForm.checkOut) : 'Select time'}
                        </small>
                        {timeError && <div className="staff-error" style={{fontSize: '12px', marginTop: '5px'}}>{timeError}</div>}
                      </div>
                      
                      <div className="staff-form-group" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="notes">Notes {(
                          attendanceForm.status === 'absent' || 
                          attendanceForm.status === 'on_leave' || 
                          attendanceForm.status === 'late' || 
                          attendanceForm.status === 'half_day'
                        ) && <span style={{ color: '#dc3545' }}>*</span>}</label>
                        <textarea
                          id="notes"
                          name="notes"
                          value={attendanceForm.notes}
                          onChange={handleAttendanceInputChange}
                          className="staff-form-control"
                          rows="3"
                          placeholder="Additional notes..."
                          required={
                            attendanceForm.status === 'absent' || 
                            attendanceForm.status === 'on_leave' || 
                            attendanceForm.status === 'late' || 
                            attendanceForm.status === 'half_day'
                          }
                          disabled={loading}
                        />
                        <small className="form-help-text" style={{ fontSize: '0.8em', color: '#6c757d' }}>
                          Required for: Absent, On Leave, Late, Half Day
                        </small>
                      </div>
                    </div>
                    
                    <div className="staff-form-actions" style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      justifyContent: 'flex-end', 
                      marginTop: '1.5rem' 
                    }}>
                      <button 
                        type="button" 
                        className="staff-btn staff-btn-secondary"
                        onClick={() => setShowAttendanceModal(false)}
                        disabled={loading}
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="staff-btn staff-btn-primary"
                        disabled={!!timeError || loading}
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        {loading ? 'Saving...' : 'Save Attendance'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'payroll' && (
          <div className="staff-payroll-container">
            {/* Payroll Header with Generate Button */}
            <div className="staff-table-header">
              <div className="staff-table-header">
                <h3>Payroll Management</h3>
                <button 
                  className="staff-btn staff-btn-primary"
                  onClick={handleOpenGeneratePayroll}
                  disabled={payrollLoading}
                >
                  <FaFileInvoiceDollar /> Generate Payroll
                </button>
              </div>
            </div>

            {/* Payroll Search Field - Fixed to prevent focus loss */}
            <div className="staff-payroll-search" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                <FaSearch className="staff-search-icon" style={{ 
                  position: 'absolute', 
                  left: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none' 
                }} />
                <input 
                  type="text" 
                  placeholder="Search payroll by staff name..." 
                  value={payrollSearchTerm}
                  onChange={handlePayrollSearch}
                  className="staff-form-control"
                  disabled={payrollLoading}
                  style={{ 
                    paddingLeft: '35px',
                    backgroundColor: payrollLoading ? '#f5f5f5' : 'white',
                    cursor: payrollLoading ? 'not-allowed' : 'text'
                  }}
                />
              </div>
              {payrollSearchTerm && (
                <button
                  type="button"
                  className="staff-btn staff-btn-secondary"
                  style={{ padding: '0.5rem' }}
                  onClick={() => {
                    setPayrollSearchTerm('');
                    setDebouncedPayrollSearchTerm('');
                  }}
                  disabled={payrollLoading}
                >
                  Clear
                </button>
              )}
            </div>
            
            {payrollLoading && <div className="staff-loading">Loading payroll data...</div>}
            {payrollError && <div className="staff-error">{payrollError}</div>}
            
            <div className="staff-dashboard-cards">
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-primary">
                  <FaUsers />
                </div>
                <div className="staff-stat-info">
                  <h3>{computedPayrollSummary.totalStaff}</h3>
                  <p>Total Staff</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-success">
                  <FaMoneyBillWave />
                </div>
                <div className="staff-stat-info">
                  <h3>NPR {computedPayrollSummary.totalBasicSalary?.toLocaleString() || '0'}</h3>
                  <p>Total Salary</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-success">
                  <FaMoneyBillWave />
                </div>
                <div className="staff-stat-info">
                  <h3>NPR {computedPayrollSummary.totalAllowances?.toLocaleString() || '0'}</h3>
                  <p>Total Allowance</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-danger">
                  <FaCalculator />
                </div>
                <div className="staff-stat-info">
                  <h3>NPR {computedPayrollSummary.totalDeductions?.toLocaleString() || '0'}</h3>
                  <p>Total Deduction</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-warning">
                  <FaMoneyCheckAlt />
                </div>
                <div className="staff-stat-info">
                  <h3>{computedPayrollSummary.pending || 0}</h3>
                  <p>Pending Payments</p>
                </div>
              </div>
              <div className="staff-card staff-stat-card">
                <div className="staff-stat-icon staff-bg-success">
                  <FaMoneyBillWave />
                </div>
                <div className="staff-stat-info">
                  <h3>NPR {((computedPayrollSummary.totalBasicSalary || 0) + (computedPayrollSummary.totalAllowances || 0) - (computedPayrollSummary.totalDeductions || 0)).toLocaleString()}</h3>
                  <p>Actual Amount</p>
                </div>
              </div>
            </div>

            {/* Payroll Filters */}
            <div className="staff-payroll-filters" style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginBottom: '1rem', 
              flexWrap: 'wrap',
              alignItems: 'end'
            }}>
              <div className="staff-form-group">
                <label htmlFor="yearFilter">Year</label>
                <select
                  id="yearFilter"
                  value={selectedYear || ''}
                  onChange={(e) => {
                    setSelectedYear(e.target.value ? parseInt(e.target.value) : null);
                    if (!e.target.value) setSelectedMonth(null); // Reset month if year cleared
                  }}
                  className="staff-form-control"
                  disabled={payrollLoading}
                >
                  <option value="">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              {selectedYear && (
                <div className="staff-form-group">
                  <label htmlFor="monthFilter">Month</label>
                  <select
                    id="monthFilter"
                    value={selectedMonth || ''}
                    onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
                    className="staff-form-control"
                    disabled={payrollLoading}
                  >
                    <option value="">All Months</option>
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="staff-form-group">
                <label htmlFor="statusFilter">Status</label>
                <select
                  id="statusFilter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="staff-form-control"
                  disabled={payrollLoading}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="staff-table-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4>Payroll Records {filteredPayrolls.length > 0 && `(${filteredPayrolls.length} records)`}</h4>
                {payrollSearchTerm && (
                  <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                    Showing results for: "{payrollSearchTerm}"
                  </p>
                )}
              </div>
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Month/Year</th>
                    <th>Net Salary (NPR)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayrolls.map(payroll => (
                    <tr key={payroll._id}>
                      <td>{payroll.staff?.name || 'Unknown'}</td>
                      <td>{`${payroll.month}/${payroll.year}`}</td>
                      <td>NPR {payroll.netSalary?.toLocaleString() || '0'}</td>
                      <td>
                        <span className={`staff-status staff-status-${payroll.status}`}>
                          {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="staff-action-btn staff-edit-btn"
                          onClick={() => handleViewPayroll(payroll)}
                          disabled={payrollLoading}
                          title="View details"
                        >
                          <FaEdit />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPayrolls.length === 0 && !payrollLoading && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                        {payrollSearchTerm ? 
                          `No payroll records found for "${payrollSearchTerm}"` : 
                          'No payroll records found.'
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {showGeneratePayrollModal && (
              <div className="staff-modal" style={{ 
                display: 'flex', 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                justifyContent: 'center', 
                alignItems: 'center', 
                zIndex: 1000 
              }}>
                <div className="staff-modal-content" style={{ 
                  background: 'white', 
                  padding: '2rem', 
                  borderRadius: '8px', 
                  maxWidth: '500px', 
                  width: '90%', 
                  maxHeight: '90%', 
                  overflowY: 'auto' 
                }}>
                  <div className="staff-modal-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem' 
                  }}>
                    <h3>{isEdit ? 'Edit Payroll' : 'Generate Payroll'}</h3>
                    <button 
                      className="staff-modal-close"
                      onClick={() => setShowGeneratePayrollModal(false)}
                      disabled={payrollLoading}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        fontSize: '1.5rem', 
                        cursor: 'pointer' 
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  <form onSubmit={handleGeneratePayroll}>
                    <div className="staff-form-grid" style={{ display: 'grid', gap: '1rem' }}>
                      <div className="staff-form-group">
                        <label htmlFor="staffId">Staff Member *</label>
                        <select
                          id="staffId"
                          name="staffId"
                          value={payrollForm.staffId}
                          onChange={handlePayrollInputChange}
                          className="staff-form-control"
                          required
                          disabled={payrollLoading || isEdit}
                        >
                          <option value="">Select staff</option>
                          {activeStaff.map(staff => (
                            <option key={staff._id} value={staff._id}>{staff.name} - {staff.position}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="staff-form-group">
                        <label htmlFor="month">Month *</label>
                        <input
                          type="number"
                          id="month"
                          name="month"
                          value={payrollForm.month}
                          onChange={handlePayrollInputChange}
                          className="staff-form-control"
                          disabled={payrollLoading || isEdit}
                          min="1"
                          max="12"
                        />
                      </div>
                      
                      <div className="staff-form-group">
                        <label htmlFor="year">Year *</label>
                        <input
                          type="number"
                          id="year"
                          name="year"
                          value={payrollForm.year}
                          onChange={handlePayrollInputChange}
                          className="staff-form-control"
                          required
                          disabled={payrollLoading || isEdit}
                          min={new Date().getFullYear() - 5}
                          max={new Date().getFullYear() + 5}
                        />
                      </div>

                      <div className="staff-form-group">
                        <label htmlFor="salary">Salary *</label>
                        <input
                          type="number"
                          id="salary"
                          name="salary"
                          value={payrollForm.salary}
                          className="staff-form-control"
                          disabled
                          min="0"
                        />
                      </div>

                      <div className="staff-form-group">
                        <label htmlFor="date">Date</label>
                        <input
                          type="date"
                          id="date"
                          name="date"
                          value={payrollForm.date}
                          className="staff-form-control"
                          disabled
                        />
                      </div>

                      <div className="staff-form-group">
                        <label htmlFor="time">Time</label>
                        <input
                          type="time"
                          id="time"
                          name="time"
                          value={payrollForm.time}
                          className="staff-form-control"
                          disabled
                        />
                      </div>

                      <div className="staff-form-group">
                        <label htmlFor="status">Status</label>
                        <select
                          id="status"
                          name="status"
                          value={payrollForm.status}
                          onChange={handlePayrollInputChange}
                          className="staff-form-control"
                          disabled={payrollLoading}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                      
                      {/* Allowance */}
                      <div className="staff-form-group" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="allowance">Allowance (NPR)</label>
                        <input
                          type="number"
                          id="allowance"
                          name="allowance"
                          value={payrollForm.allowance}
                          onChange={handlePayrollInputChange}
                          className="staff-form-control"
                          disabled={payrollLoading}
                          min="0"
                          step="0.01"
                        />
                        <small className="form-help-text">Additional allowances (transport, medical, etc.)</small>
                      </div>
                      
                      {/* Deduction */}
                      <div className="staff-form-group" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="deduction">Deduction (NPR)</label>
                        <input
                          type="number"
                          id="deduction"
                          name="deduction"
                          value={payrollForm.deduction}
                          onChange={handlePayrollInputChange}
                          className="staff-form-control"
                          disabled={payrollLoading}
                          min="0"
                          step="0.01"
                        />
                        <small className="form-help-text">Deductions (tax, loans, etc.)</small>
                      </div>

                      <div className="staff-form-group staff-form-full-width" style={{ 
                        gridColumn: '1 / -1', 
                        backgroundColor: '#f8f9fa', 
                        padding: '1rem', 
                        borderRadius: '4px',
                        textAlign: 'center',
                        fontSize: '1.1em',
                        fontWeight: 'bold'
                      }}>
                        <p><strong>Net Salary:</strong> NPR {(Number(payrollForm.salary) + Number(payrollForm.allowance) - Number(payrollForm.deduction)).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="staff-form-actions" style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      justifyContent: 'flex-end', 
                      marginTop: '1.5rem' 
                    }}>
                      <button 
                        type="button" 
                        className="staff-btn staff-btn-secondary"
                        onClick={() => setShowGeneratePayrollModal(false)}
                        disabled={payrollLoading}
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="staff-btn staff-btn-primary"
                        disabled={payrollLoading}
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        {payrollLoading ? 'Processing...' : (isEdit ? 'Update Payroll' : 'Generate Payroll')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showPayrollDetailsModal && selectedPayroll && (
              <div className="staff-modal" style={{ 
                display: 'flex', 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                justifyContent: 'center', 
                alignItems: 'center', 
                zIndex: 1000 
              }}>
                <div className="staff-modal-content" style={{ 
                  background: 'white', 
                  padding: '2rem', 
                  borderRadius: '8px', 
                  maxWidth: '400px', 
                  width: '90%', 
                  maxHeight: '90%', 
                  overflowY: 'auto' 
                }}>
                  <div className="staff-modal-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem' 
                  }}>
                    <h3>Payroll Details for {selectedPayroll.staff?.name}</h3>
                    <button 
                      className="staff-modal-close"
                      onClick={() => setShowPayrollDetailsModal(false)}
                      disabled={payrollLoading}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        fontSize: '1.5rem', 
                        cursor: 'pointer' 
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  <div className="staff-payroll-details" style={{ lineHeight: '1.6' }}>
                    <p><strong>Month/Year:</strong> {`${selectedPayroll.month}/${selectedPayroll.year}`}</p>
                    <p><strong>Basic Salary:</strong> NPR {selectedPayroll.basicSalary?.toLocaleString() || '0'}</p>
                    <div style={{ margin: '1rem 0', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Allowance</h4>
                      <p style={{ margin: 0 }}>NPR {selectedPayroll.allowance?.toLocaleString() || '0'}</p>
                    </div>
                    <div style={{ margin: '1rem 0', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Deduction</h4>
                      <p style={{ margin: 0 }}>NPR {selectedPayroll.deduction?.toLocaleString() || '0'}</p>
                    </div>
                    <p style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#28a745' }}>
                      <strong>Net Salary:</strong> NPR {selectedPayroll.netSalary?.toLocaleString() || '0'}
                    </p>
                    <p><strong>Status:</strong> 
                      <span className={`staff-status staff-status-${selectedPayroll.status}`} style={{ marginLeft: '0.5rem' }}>
                        {selectedPayroll.status.charAt(0).toUpperCase() + selectedPayroll.status.slice(1)}
                      </span>
                    </p>
                    <div className="staff-form-actions" style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      justifyContent: 'flex-end', 
                      marginTop: '1.5rem' 
                    }}>
                      <button 
                        className="staff-btn staff-btn-secondary"
                        onClick={() => setShowPayrollDetailsModal(false)}
                        disabled={payrollLoading}
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        Close
                      </button>
                      <button 
                        className="staff-btn staff-btn-primary"
                        onClick={handleEditPayroll}
                        disabled={payrollLoading}
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        <FaEdit /> Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
       {activeTab === 'performance' && <StaffPerformance />}
        
        {activeTab === 'settings' && (
  <div className="staff-settings-container">
    <div className="staff-table-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FaCog style={{ color: '#007bff' }} />
        <h3>Staff Management Settings</h3>
      </div>
      <p>Configure shop operating hours, business information, and staff policies</p>
    </div>
    
    {staffSettingsLoading && <div className="staff-loading">Loading settings...</div>}
    {staffSettingsError && <div className="staff-error">{staffSettingsError}</div>}
    
    <div className="staff-form-container">
      <form onSubmit={handleSaveStaffSettings}>
        <div className="staff-form-grid" style={{ display: 'grid', gap: '2rem' }}>
          
          {/* Shop Operating Hours Section */}
          <div className="staff-form-section">
            <div className="section-header">
              <h4><FaClock /> Shop Operating Hours</h4>
              <p>Set your shop's daily operating schedule for attendance tracking</p>
            </div>
            
            <div className="staff-form-grid" style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
              <div className="staff-form-group">
                <label htmlFor="openingTime">
                  <FaBuilding style={{ marginRight: '0.5rem', color: '#28a745' }} />
                  Shop Opening Time <span className="required">*</span>
                </label>
                <input
                  type="time"
                  id="openingTime"
                  name="openingTime"
                  value={staffSettings.openingTime}
                  onChange={handleStaffSettingsInputChange}
                  className="staff-form-control"
                  required
                  disabled={staffSettingsLoading}
                  min="00:00"
                  max="23:59"
                />
                <small className="form-help-text">
                  {staffSettings.openingTime ? formatTo12Hour(staffSettings.openingTime) : 'Select opening time'}
                </small>
              </div>
              
              <div className="staff-form-group">
                <label htmlFor="closingTime">
                  <FaClock style={{ marginRight: '0.5rem', color: '#dc3545' }} />
                  Shop Closing Time <span className="required">*</span>
                </label>
                <input
                  type="time"
                  id="closingTime"
                  name="closingTime"
                  value={staffSettings.closingTime}
                  onChange={handleStaffSettingsInputChange}
                  className="staff-form-control"
                  required
                  disabled={staffSettingsLoading}
                  min="00:00"
                  max="23:59"
                />
                <small className="form-help-text">
                  {staffSettings.closingTime ? formatTo12Hour(staffSettings.closingTime) : 'Select closing time'}
                </small>
              </div>
            </div>
            
            {/* Operating Hours Summary */}
            {staffSettings.openingTime && staffSettings.closingTime && !staffSettingsLoading && (
              <div className="settings-summary-card">
                <div className="summary-header">
                  <FaClock style={{ marginRight: '0.5rem' }} />
                  <span>Daily Operating Schedule</span>
                </div>
                <div className="summary-content">
                  <div className="time-display">
                    <span className="time-label">Open:</span>
                    <span className="time-value">{formatTo12Hour(staffSettings.openingTime)}</span>
                  </div>
                  <div className="time-display">
                    <span className="time-label">Close:</span>
                    <span className="time-value">{formatTo12Hour(staffSettings.closingTime)}</span>
                  </div>
                  <div className="duration-display">
                    <span className="duration-label">Duration:</span>
                    <span className="duration-value">
                      {calculateDuration(staffSettings.openingTime, staffSettings.closingTime)}
                    </span>
                  </div>
                </div>
                <div className="summary-note">
                  <FaInfoCircle style={{ marginRight: '0.25rem' }} />
                  <small>Unmarked attendance will be automatically set to absent after closing time</small>
                </div>
              </div>
            )}
          </div>
          
          {/* Business Information Section */}
          <div className="staff-form-section">
            <div className="section-header">
              <h4><FaIdCard /> Business Information</h4>
              <p>Enter your business tax and identification details</p>
            </div>
            
            <div className="staff-form-group">
              <label htmlFor="panNumber">
                <FaFileInvoiceDollar style={{ marginRight: '0.5rem', color: '#17a2b8' }} />
                Shop PAN Number <span className="required">*</span>
              </label>
              <input
                type="text"
                id="panNumber"
                name="panNumber"
                value={staffSettings.panNumber}
                onChange={handleStaffSettingsInputChange}
                className={`staff-form-control ${panError ? 'staff-form-control-error' : ''}`}
                placeholder="Enter 9-digit PAN number (e.g., 123456789)"
                required
                disabled={staffSettingsLoading}
                maxLength="9"
                inputMode="numeric"
                pattern="\d{9}"
              />
              <div className="input-help">
                <small className="form-help-text">Format: Exactly 9 digits (e.g., 123456789)</small>
                {staffSettings.panNumber && validatePanNumber(staffSettings.panNumber) && (
                  <div className="validation-success">
                    <FaCheck style={{ marginRight: '0.25rem', color: '#28a745' }} />
                    <small>Valid PAN format</small>
                  </div>
                )}
              </div>
              {panError && <div className="staff-error">{panError}</div>}
            </div>
            
            {/* PAN Number Display */}
            {staffSettings.panNumber && validatePanNumber(staffSettings.panNumber) && (
              <div className="settings-summary-card">
                <div className="summary-content">
                  <div className="pan-display">
                    <span className="pan-label">Registered PAN:</span>
                    <span className="pan-value">{staffSettings.panNumber}</span>
                  </div>
                </div>
                <div className="summary-note">
                  <FaShieldAlt style={{ marginRight: '0.25rem' }} />
                  <small>PAN number used for tax reporting and payroll compliance</small>
                </div>
              </div>
            )}
          </div>
          
          {/* Staff Policy Section */}
          <div className="staff-form-section">
            <div className="section-header">
              <h4><FaUsersCog /> Staff Policies</h4>
              <p>Configure default working conditions and leave policies</p>
            </div>
            
            <div className="staff-form-grid" style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              <div className="staff-form-group">
                <label htmlFor="defaultShiftHours">
                  <FaClock style={{ marginRight: '0.5rem', color: '#6f42c1' }} />
                  Default Shift Hours <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="defaultShiftHours"
                  name="defaultShiftHours"
                  value={staffSettings.defaultShiftHours}
                  onChange={handleStaffSettingsInputChange}
                  className="staff-form-control"
                  required
                  disabled={staffSettingsLoading}
                  min="1"
                  max="12"
                  step="0.5"
                />
                <small className="form-help-text">Standard working hours per shift (used for payroll calculation)</small>
              </div>
              
              <div className="staff-form-group">
                <label htmlFor="overtimeRate">
                  <FaCalculator style={{ marginRight: '0.5rem', color: '#fd7e14' }} />
                  Overtime Rate <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="overtimeRate"
                  name="overtimeRate"
                  value={staffSettings.overtimeRate}
                  onChange={handleStaffSettingsInputChange}
                  className="staff-form-control"
                  required
                  disabled={staffSettingsLoading}
                  min="1"
                  max="3"
                  step="0.1"
                />
                <small className="form-help-text">Multiplier for overtime pay (e.g., 1.5x = 50% extra)</small>
              </div>
              
              <div className="staff-form-group">
                <label htmlFor="maxLeavesPerYear">
                  <FaCalendarAlt style={{ marginRight: '0.5rem', color: '#e83e8c' }} />
                  Max Annual Leaves <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="maxLeavesPerYear"
                  name="maxLeavesPerYear"
                  value={staffSettings.maxLeavesPerYear}
                  onChange={handleStaffSettingsInputChange}
                  className="staff-form-control"
                  required
                  disabled={staffSettingsLoading}
                  min="0"
                  max="30"
                />
                <small className="form-help-text">Maximum paid leave days allowed per year</small>
              </div>
              
              <div className="staff-form-group">
                <div className="checkbox-container">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="requireManagerApprovalForLeave"
                      checked={staffSettings.requireManagerApprovalForLeave}
                      onChange={handleStaffSettingsInputChange}
                      disabled={staffSettingsLoading}
                    />
                    <span className="checkmark"></span>
                    <span className="checkbox-text">
                      <FaUserCheck style={{ marginRight: '0.5rem', color: '#20c997' }} />
                      Require Manager Approval for Leaves
                    </span>
                  </label>
                </div>
                <small className="form-help-text">All leave requests must be approved by a manager before approval</small>
              </div>
            </div>
          </div>
          
          {/* Settings Summary Card */}
          <div className="staff-form-section summary-section">
            <div className="section-header">
              <h4><FaListCheck /> Current Settings Summary</h4>
              <p>Review your current configuration before saving</p>
            </div>
            
            <div className="settings-summary-grid">
              <div className="summary-item">
                <div className="summary-icon">
                  <FaClock />
                </div>
                <div className="summary-details">
                  <div className="summary-label">Operating Hours</div>
                  <div className="summary-value">
                    {staffSettings.openingTime && staffSettings.closingTime 
                      ? `${formatTo12Hour(staffSettings.openingTime)} - ${formatTo12Hour(staffSettings.closingTime)}`
                      : 'Not configured'
                    }
                  </div>
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-icon">
                  <FaIdCard />
                </div>
                <div className="summary-details">
                  <div className="summary-label">PAN Number</div>
                  <div className={`summary-value ${validatePanNumber(staffSettings.panNumber) ? 'valid' : 'invalid'}`}>
                    {staffSettings.panNumber || 'Not configured'}
                    {staffSettings.panNumber && !validatePanNumber(staffSettings.panNumber) && (
                      <FaExclamationTriangle style={{ marginLeft: '0.25rem', color: '#ffc107' }} />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-icon">
                  <FaClock />
                </div>
                <div className="summary-details">
                  <div className="summary-label">Shift Hours</div>
                  <div className="summary-value">{staffSettings.defaultShiftHours}h</div>
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-icon">
                  <FaCalculator />
                </div>
                <div className="summary-details">
                  <div className="summary-label">Overtime Rate</div>
                  <div className="summary-value">{staffSettings.overtimeRate}x</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="staff-form-actions" style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'space-between', 
          marginTop: '2rem',
          flexWrap: 'wrap'
        }}>
          <button 
            type="button" 
            className="staff-btn staff-btn-secondary"
            onClick={fetchStaffSettings}
            disabled={staffSettingsLoading}
          >
            <FaSyncAlt style={{ transform: 'rotate(180deg)' }} /> Reset to Defaults
          </button>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="staff-btn staff-btn-outline"
              onClick={() => {
                if (window.confirm('Discard all changes?')) {
                  fetchStaffSettings();
                }
              }}
              disabled={staffSettingsLoading}
            >
              <FaTimes /> Discard Changes
            </button>
            <button 
              type="submit" 
              className={`staff-btn staff-btn-primary ${!!panError ? 'disabled' : ''}`} 
              disabled={staffSettingsLoading || !!panError}
            >
              <FaSave /> {staffSettingsLoading ? 'Saving Settings...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
)}
       {activeTab !== 'dashboard' && activeTab !== 'directory' && activeTab !== 'attendance' && activeTab !== 'payroll' && activeTab !== 'settings' && activeTab !== 'performance' && (
          <div className="staff-tab-placeholder" style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem' 
          }}>
            <h2>{tabItems.find(tab => tab.id === activeTab)?.label} View</h2>
            <p>This section would show the {activeTab} management interface.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagementSystem;