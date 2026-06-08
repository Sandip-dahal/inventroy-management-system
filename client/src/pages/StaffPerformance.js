import React, { useState, useEffect, useMemo } from 'react';
import { FaChartLine, FaUser, FaClock, FaMoneyBillWave, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { staffAPI, attendanceAPI, payrollAPI } from '../services/api';

const StaffPerformance = () => {
  const [staffData, setStaffData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'overallScore', direction: 'descending' });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Weights for different performance categories
  const weights = {
    attendance: 0.4,
    punctuality: 0.3,
    financial: 0.3
  };

  // Points for different attendance statuses
  const attendancePoints = {
    present: 1.0,
    on_leave: 0.7,
    half_day: 0.5,
    late: 0.3,
    absent: 0.0
  };

  // Punctuality penalty points
  const punctualityPenalties = {
    late: 0.5,
    half_day: 0.3,
    on_leave: 0.2,
    absent: 1.0 // Maximum penalty for absence
  };

  // Function to calculate total days in the selected month
  const getTotalDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  // Function to calculate days before joining in the selected month
  const getDaysBeforeJoining = (joiningDate, selectedMonth, selectedYear) => {
    if (!joiningDate) return 0;
    const joinDate = new Date(joiningDate);
    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
    if (joinDate < firstDayOfMonth) return 0;
    if (joinDate.getFullYear() > selectedYear || (joinDate.getFullYear() === selectedYear && joinDate.getMonth() + 1 > selectedMonth)) return getTotalDaysInMonth(selectedMonth, selectedYear);
    return joinDate.getDate() - 1; // Days before joining in the selected month
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [staffResponse, attendanceResponse, payrollResponse] = await Promise.all([
          staffAPI.getAllStaff(),
          attendanceAPI.getAttendance({
            month: selectedMonth,
            year: selectedYear
          }),
          payrollAPI.getPayrolls({
            month: selectedMonth,
            year: selectedYear
          })
        ]);

        setStaffData(staffResponse.data?.staff || staffResponse.data || []);
        setAttendanceData(attendanceResponse.data?.attendance || attendanceResponse.data || []);
        setPayrollData(payrollResponse.data?.payrolls || payrollResponse.data || []);
        
      } catch (err) {
        setError('Failed to fetch performance data. Please try again.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedYear]);

  const performanceData = useMemo(() => {
    if (!Array.isArray(staffData) || staffData.length === 0) {
      return [];
    }

    // Get total days in the selected month
    const totalDaysInMonth = getTotalDaysInMonth(selectedMonth, selectedYear);

    // Find max allowance to normalize scores
    const payrollsWithAllowance = payrollData.filter(p => p && p.allowance > 0);
    const maxAllowance = payrollsWithAllowance.length > 0 
      ? Math.max(...payrollsWithAllowance.map(p => p.allowance))
      : 0;

    return staffData.map(staff => {
      // Filter attendance records for this staff member and selected period
      const monthAttendance = attendanceData.filter(a => {
        if (!a || !a.staff || !a.status) return false;
        
        const staffId = a.staff._id || a.staff;
        const date = new Date(a.date);
        return staffId === staff._id &&
               date.getMonth() + 1 === selectedMonth &&
               date.getFullYear() === selectedYear;
      });

      // Calculate present days
      const presentDays = monthAttendance.filter(a => a.status === 'present').length;

      // Calculate effective working days
      const daysBeforeJoining = getDaysBeforeJoining(staff.joiningDate, selectedMonth, selectedYear);
      const workingDays = Math.max(1, totalDaysInMonth - daysBeforeJoining); // Ensure at least 1 day to avoid division by zero

      // Calculate attendance percentage (consistency)
      const attendancePercentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

      // Calculate contribution percentage (fairness)
      const contributionPercentage = (presentDays / totalDaysInMonth) * 100;

      // Calculate punctuality score
      let punctualityDeductions = 0;
      monthAttendance.forEach(record => {
        if (record.status in punctualityPenalties) {
          punctualityDeductions += punctualityPenalties[record.status];
        }
      });
      
      const punctualityScore = Math.max(0, 100 - (punctualityDeductions / workingDays) * 100);

      // Calculate financial score
      let financialScore = 0;
      const monthPayroll = payrollData.find(p => {
        if (!p || !p.staff) return false;
        
        const staffId = p.staff._id || p.staff;
        return staffId === staff._id &&
               p.month === selectedMonth &&
               p.year === selectedYear;
      });

      if (monthPayroll) {
        const allowanceScore = maxAllowance > 0 
          ? (monthPayroll.allowance / maxAllowance) * 60 
          : 0;
        const workingDaysStandard = 22;
        const dailyRate = (monthPayroll.basicSalary + monthPayroll.allowance) / workingDaysStandard;
        const expectedEarnings = (attendancePercentage / 100) * dailyRate * workingDaysStandard;
        const actualEarnings = monthPayroll.netSalary || (monthPayroll.basicSalary + monthPayroll.allowance - (monthPayroll.deduction || 0));
        
        const efficiencyRatio = actualEarnings > 0 
          ? Math.min(1.5, expectedEarnings / actualEarnings)
          : 1;
        
        const efficiencyScore = efficiencyRatio * 40;
        financialScore = allowanceScore + efficiencyScore;
        financialScore = Math.min(100, Math.max(0, financialScore));
      } else {
        financialScore = 0; // Set financial score to 0 if no payroll record is found
      }

      // Calculate overall weighted score using attendancePercentage (consistency)
      const overallScore = Math.round(
        (attendancePercentage * weights.attendance) +
        (punctualityScore * weights.punctuality) +
        (financialScore * weights.financial)
      );

      return {
        ...staff,
        attendanceScore: Math.round(contributionPercentage), // Display contribution percentage in the table
        attendancePercentage: Math.round(attendancePercentage), // Store consistency percentage for internal use
        punctualityScore: Math.round(punctualityScore),
        financialScore: Math.round(financialScore),
        overallScore,
        monthAttendanceCount: monthAttendance.length,
        payrollData: monthPayroll,
        allowanceAmount: monthPayroll ? monthPayroll.allowance : 0,
        presentDays,
        totalDaysInMonth
      };
    });
  }, [staffData, attendanceData, payrollData, selectedMonth, selectedYear]);

  const sortedPerformanceData = useMemo(() => {
    const sortableData = [...performanceData];
    
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableData.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }, [performanceData, sortConfig]);

  const handleSort = (key) => {
    let direction = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort />;
    return sortConfig.direction === 'ascending' ? <FaSortUp /> : <FaSortDown />;
  };

  const chartData = sortedPerformanceData.slice(0, 10).map(staff => ({
    name: staff.name,
    attendance: staff.attendanceScore, // Use contribution percentage for charts
    punctuality: staff.punctualityScore,
    financial: staff.financialScore,
    overall: staff.overallScore
  }));

  const categoryData = [
    { name: 'Attendance', value: weights.attendance * 100 },
    { name: 'Punctuality', value: weights.punctuality * 100 },
    { name: 'Financial', value: weights.financial * 100 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const fontSize = window.innerWidth < 768 ? 10 : window.innerWidth < 1024 ? 12 : 14;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading) {
    return <div className="staff-performance loading">Loading performance data...</div>;
  }

  if (error) {
    return <div className="staff-performance error">{error}</div>;
  }

  if (!sortedPerformanceData.length) {
    return (
      <div className="staff-performance">
        No performance data available for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.
      </div>
    );
  }

  return (
    <div className="staff-performance">
      <div className="performance-header">
        <h2><FaChartLine /> Staff Performance Dashboard</h2>
        <div className="filters">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="filter-select"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="filter-select"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="performance-summary">
        <div className="summary-card">
          <div className="summary-icon attendance">
            <FaUser />
          </div>
          <div className="summary-content">
            <h3>Average Attendance</h3>
            <p className="summary-value">
              {Math.round(sortedPerformanceData.reduce((sum, staff) => sum + staff.attendanceScore, 0) / sortedPerformanceData.length)}%
            </p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon punctuality">
            <FaClock />
          </div>
          <div className="summary-content">
            <h3>Average Punctuality</h3>
            <p className="summary-value">
              {Math.round(sortedPerformanceData.reduce((sum, staff) => sum + staff.punctualityScore, 0) / sortedPerformanceData.length)}%
            </p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon financial">
            <FaMoneyBillWave />
          </div>
          <div className="summary-content">
            <h3>Average Financial</h3>
            <p className="summary-value">
              {Math.round(sortedPerformanceData.reduce((sum, staff) => sum + staff.financialScore, 0) / sortedPerformanceData.length)}%
            </p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon overall">
            <FaChartLine />
          </div>
          <div className="summary-content">
            <h3>Average Overall</h3>
            <p className="summary-value">
              {Math.round(sortedPerformanceData.reduce((sum, staff) => sum + staff.overallScore, 0) / sortedPerformanceData.length)}%
            </p>
          </div>
        </div>
      </div>

      <div className="top-performers">
        <h3>Top Performers</h3>
        <div className="performer-cards">
          {sortedPerformanceData.slice(0, 3).map((staff, index) => (
            <div key={staff._id} className={`performer-card rank-${index + 1}`}>
              <div className="rank-badge">{index + 1}</div>
              <div className="staff-info">
                <h4>{staff.name}</h4>
                <p>{staff.position}</p>
                {staff.payrollData && (
                  <p className="allowance-info">Allowance: Rs. {staff.allowanceAmount}</p>
                )}
              </div>
              <div className="performance-score">
                <div className="score">{staff.overallScore}%</div>
                <div className="score-breakdown">
                  <span>A: {staff.attendanceScore}%</span>
                  <span>P: {staff.punctualityScore}%</span>
                  <span>F: {staff.financialScore}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="performance-charts">
        <div className="chart-container">
          <h3>Performance Category Weights</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={renderCustomLabel}
                outerRadius="70%"
                innerRadius="0%"
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value}%`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Top 10 Staff Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="attendance" fill="#0088FE" name="Attendance" />
              <Bar dataKey="punctuality" fill="#00C49F" name="Punctuality" />
              <Bar dataKey="financial" fill="#FFBB28" name="Financial" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="performance-table-container">
        <h3>Detailed Performance Analysis</h3>
        <table className="performance-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th onClick={() => handleSort('name')}>
                <div className="sortable-header">
                  <span>Staff Name</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th onClick={() => handleSort('position')}>
                <div className="sortable-header">
                  <span>Position</span>
                  {getSortIcon('position')}
                </div>
              </th>
              <th onClick={() => handleSort('presentDays')}>
                <div className="sortable-header">
                  <span>Present Days</span>
                  {getSortIcon('presentDays')}
                </div>
              </th>
              <th>Allowance</th>
              <th onClick={() => handleSort('attendanceScore')}>
                <div className="sortable-header">
                  <span><FaUser /> Attendance</span>
                  {getSortIcon('attendanceScore')}
                </div>
              </th>
              <th onClick={() => handleSort('punctualityScore')}>
                <div className="sortable-header">
                  <span><FaClock /> Punctuality</span>
                  {getSortIcon('punctualityScore')}
                </div>
              </th>
              <th onClick={() => handleSort('financialScore')}>
                <div className="sortable-header">
                  <span><FaMoneyBillWave /> Financial</span>
                  {getSortIcon('financialScore')}
                </div>
              </th>
              <th onClick={() => handleSort('overallScore')}>
                <div className="sortable-header">
                  <span><FaChartLine /> Overall</span>
                  {getSortIcon('overallScore')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPerformanceData.map((staff) => (
              <tr key={staff._id}>
                <td className="rank-cell">
                  <span className={`rank rank-${staff.rank}`}>{staff.rank}</span>
                </td>
                <td className="staff-name">{staff.name}</td>
                <td className="staff-position">{staff.position}</td>
                <td className="present-days-cell">{`${staff.presentDays}/${staff.totalDaysInMonth}`}</td>
                <td className="allowance-cell">
                  {staff.payrollData ? `Rs. ${staff.allowanceAmount}` : 'No payroll'}
                </td>
                <td className="score-cell">
                  <div className="score-bar">
                    <div
                      className="score-fill attendance"
                      style={{ width: `${staff.attendanceScore}%` }}
                    ></div>
                    <span className="score-value">{staff.attendanceScore}%</span>
                  </div>
                </td>
                <td className="score-cell">
                  <div className="score-bar">
                    <div
                      className="score-fill punctuality"
                      style={{ width: `${staff.punctualityScore}%` }}
                    ></div>
                    <span className="score-value">{staff.punctualityScore}%</span>
                  </div>
                </td>
                <td className="score-cell">
                  <div className="score-bar">
                    <div
                      className="score-fill financial"
                      style={{ width: `${staff.financialScore}%` }}
                    ></div>
                    <span className="score-value">{staff.financialScore}%</span>
                  </div>
                </td>
                <td className="score-cell overall">
                  <div className="score-bar">
                    <div
                      className="score-fill overall"
                      style={{ width: `${staff.overallScore}%` }}
                    ></div>
                    <span className="score-value">{staff.overallScore}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .staff-performance {
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f7f9;
          min-height: 100vh;
        }

        .staff-performance.loading,
        .staff-performance.error {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 50vh;
          font-size: 18px;
        }

        .staff-performance.error {
          color: #dc3545;
        }

        .performance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .performance-header h2 {
          margin: 0;
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .filters {
          display: flex;
          gap: 10px;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: white;
          font-size: 14px;
        }

        .performance-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .summary-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .summary-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: white;
        }

        .summary-icon.attendance {
          background: #0088FE;
        }

        .summary-icon.punctuality {
          background: #00C49F;
        }

        .summary-icon.financial {
          background: #FFBB28;
        }

        .summary-icon.overall {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .summary-content h3 {
          margin: 0 0 5px 0;
          font-size: 14px;
          color: #6c757d;
        }

        .summary-value {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
        }

        .top-performers {
          margin-bottom: 30px;
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .top-performers h3 {
          margin-top: 0;
          color: #2c3e50;
          border-bottom: 2px solid #eee;
          padding-bottom: 10px;
        }

        .performer-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .performer-card {
          position: relative;
          padding: 20px;
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        }

        .performer-card.rank-1 {
          background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
        }

        .performer-card.rank-2 {
          background: linear-gradient(135deg, #d4d4d4 0%, #919191 100%);
        }

        .performer-card.rank-3 {
          background: linear-gradient(135deg, #cd7f32 0%, #a55a23 100%);
        }

        .rank-badge {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 30px;
          height: 30px;
          background: #e74c3c;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .staff-info h4 {
          margin: 0 0 5px 0;
          font-size: 18px;
        }

        .staff-info p {
          margin: 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .allowance-info {
          font-weight: bold;
          margin-top: 5px !important;
        }

        .performance-score {
          margin-top: 15px;
        }

        .performance-score .score {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .score-breakdown {
          display: flex;
          justify-content: space-around;
          font-size: 12px;
          opacity: 0.9;
        }

        .performance-charts {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .chart-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 20px;
          overflow: visible;
        }

        .chart-container h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #2c3e50;
          text-align: center;
          font-size: 16px;
        }

        .performance-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
          margin-bottom: 30px;
        }

        .performance-table-container h3 {
          padding: 20px;
          margin: 0;
          background-color: #f8f9fa;
          border-bottom: 1px solid #eee;
          color: #2c3e50;
        }

        .performance-table {
          width: 100%;
          border-collapse: collapse;
        }

        .performance-table th {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          color: #495057;
          cursor: pointer;
          user-select: none;
          border-bottom: 2px solid #dee2e6;
        }

        .performance-table td {
          padding: 15px;
          border-bottom: 1px solid #eee;
        }

        .sortable-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5px;
        }

        .rank-cell {
          text-align: center;
          width: 60px;
        }

        .rank {
          display: inline-block;
          width: 30px;
          height: 30px;
          line-height: 30px;
          text-align: center;
          border-radius: 50%;
          font-weight: bold;
          font-size: 14px;
        }

        .rank-1 {
          background-color: gold;
          color: #333;
        }

        .rank-2 {
          background-color: silver;
          color: #333;
        }

        .rank-3 {
          background-color: #cd7f32;
          color: white;
        }

        .staff-name {
          font-weight: 500;
          color: #2c3e50;
        }

        .staff-position {
          color: #6c757d;
          font-size: 14px;
        }

        .present-days-cell {
          font-weight: 500;
          color: #495057;
          text-align: center;
        }

        .allowance-cell {
          font-weight: 500;
          color: #28a745;
        }

        .score-cell {
          width: 150px;
        }

        .score-cell.overall {
          font-weight: bold;
        }

        .score-bar {
          position: relative;
          height: 24px;
          background-color: #f8f9fa;
          border-radius: 12px;
          overflow: hidden;
        }

        .score-fill {
          height: 100%;
          border-radius: 12px;
          transition: width 0.3s ease;
        }

        .score-fill.attendance {
          background-color: #0088FE;
        }

        .score-fill.punctuality {
          background-color: #00C49F;
        }

        .score-fill.financial {
          background-color: #FFBB28;
        }

        .score-fill.overall {
          background: linear-gradient(90deg, #0088FE, #00C49F, #FFBB28);
        }

        .score-value {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
          font-weight: 500;
          color: #333;
          text-shadow: 0 0 2px white;
        }

        @media (max-width: 768px) {
          .performance-charts {
            grid-template-columns: 1fr;
          }

          .performance-summary {
            grid-template-columns: 1fr 1fr;
          }

          .performance-table {
            font-size: 14px;
          }

          .performance-table th,
          .performance-table td {
            padding: 10px;
          }

          .performer-cards {
            grid-template-columns: 1fr;
          }

          .chart-container {
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default StaffPerformance;