import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subMonths, addMonths, isSameMonth, isSameDay, parseISO, isBefore, startOfToday } from 'date-fns';
import { th } from 'date-fns/locale'; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Car, Clock, User, LogOut, Plus, RefreshCw, Trash2, AlertTriangle, X, CalendarOff, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, CheckCircle, Info, PlayCircle, StopCircle, XCircle, Lock, QrCode, Users, LayoutDashboard, AlertCircle, Ban, Mail, PieChart as ChartIcon, Key, ToggleLeft, ToggleRight, Edit as EditIcon } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';
const LINE_BOT_ID = '@your_bot_id'; 

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [cars, setCars] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]); 
  const [stats, setStats] = useState({ carStats: [], deptStats: [], driverStats: [] });
  const [loading, setLoading] = useState(false);
  
  const [viewMode, setViewMode] = useState('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // Forms
  const [newCar, setNewCar] = useState({ name: '', plate: '' });
  const [newDriver, setNewDriver] = useState({ name: '', phone: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', firstName: '', lastName: '', email: '', department: '', role: 'user' });
  const [formData, setFormData] = useState({ startDate: '', startTime: '', endDate: '', endTime: '', useDriver: false, remarks: '' });
  
  // Modals
  const [blockModal, setBlockModal] = useState({ show: false, type: '', id: '', name: '' });
  const [blockData, setBlockData] = useState({ startDate: '', startTime: '', endDate: '', endTime: '', remarks: '' });
  const [scheduleModal, setScheduleModal] = useState({ show: false, type: '', id: '', name: '' });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [qrModal, setQrModal] = useState(false);
  const [qrToken, setQrToken] = useState('');
  
  // Action Modals
  const [rejectModal, setRejectModal] = useState({ show: false, id: '' });
  const [startTripModal, setStartTripModal] = useState({ show: false, id: '' });
  const [endTripModal, setEndTripModal] = useState({ show: false, id: '', startOdometer: 0 });
  const [extendModal, setExtendModal] = useState({ show: false, id: '', endDate: '', endTime: '' });
  const [editUserModal, setEditUserModal] = useState({ show: false, data: null });
  const [resetPwdModal, setResetPwdModal] = useState({ show: false, id: '', username: '', newPassword: '' });

  // ** NEW: Change Password Modal (Self & Force) **
  const [changePwdModal, setChangePwdModal] = useState({ show: false, oldPassword: '', newPassword: '', confirmPassword: '', isForce: false });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' }); 
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // --- INIT ---
  useEffect(() => {
    const storedUser = localStorage.getItem('carBookingUser');
    if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        // Check force change on load
        if (user.mustChangePassword) {
            setChangePwdModal({ show: true, oldPassword: '', newPassword: '', confirmPassword: '', isForce: true });
        }
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [carsRes, driversRes, bookingsRes] = await Promise.all([
        axios.get(`${API_URL}/cars`),
        axios.get(`${API_URL}/drivers`),
        axios.get(`${API_URL}/bookings`)
      ]);
      setCars(carsRes.data);
      setDrivers(driversRes.data);
      setBookings(bookingsRes.data);
      if (currentUser?.role === 'admin') {
          const usersRes = await axios.get(`${API_URL}/users`);
          setUsers(usersRes.data);
          const statsRes = await axios.get(`${API_URL}/stats`);
          setStats(statsRes.data);
      }
    } catch (error) { showToast("ไม่สามารถเชื่อมต่อ Server ได้", "error"); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // --- HELPERS ---
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };
  const confirmAction = (title, message, actionFn) => { setConfirmDialog({ show: true, title, message, onConfirm: actionFn }); };
  const handleConfirm = () => { if (confirmDialog.onConfirm) confirmDialog.onConfirm(); setConfirmDialog({ ...confirmDialog, show: false }); };
  const STATUS_CONFIG = { pending: { label: 'รออนุมัติ', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Clock size={14}/> }, approved: { label: 'อนุมัติแล้ว', badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: <CheckCircle size={14}/> }, active: { label: 'กำลังใช้งาน', badge: 'bg-green-100 text-green-700 border-green-200', icon: <PlayCircle size={14}/> }, completed: { label: 'เสร็จสิ้น', badge: 'bg-gray-100 text-gray-600 border-gray-200', icon: <StopCircle size={14}/> }, rejected: { label: 'ไม่อนุมัติ', badge: 'bg-red-100 text-red-600 border-red-200', icon: <XCircle size={14}/> }, maintenance: { label: 'ปิดปรับปรุง/ลา', badge: 'bg-red-100 text-red-800 border-red-300', icon: <AlertTriangle size={14}/> }, cancelled: { label: 'ยกเลิก', badge: 'bg-gray-200 text-gray-500 border-gray-300', icon: <Ban size={14}/> } };
  const getStatusBadge = (status) => { const config = STATUS_CONFIG[status] || STATUS_CONFIG['pending']; return <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border ${config.badge}`}>{config.icon} {config.label}</span>; };
  const checkAvailability = (resourceType, resourceId, startDate, startTime, endDate, endTime) => {
      const reqStart = new Date(`${startDate}T${startTime}`); const reqEnd = new Date(`${endDate}T${endTime}`);
      return bookings.find(b => { if (!['approved', 'active', 'maintenance'].includes(b.status)) return false; const bStart = new Date(`${b.startDate}T${b.startTime}`); const bEnd = new Date(`${b.endDate}T${b.endTime}`); return (reqStart < bEnd && reqEnd > bStart) && ((resourceType === 'car' && b.carId && b.carId._id === resourceId) || (resourceType === 'driver' && b.driverId && b.driverId._id === resourceId)); });
  };
  const canStartTrip = (booking) => { const now = new Date(); const startTime = new Date(`${booking.startDate}T${booking.startTime}`); return now >= startTime; };

  // --- HANDLERS ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, loginData);
      const userData = { 
          name: res.data.firstName ? `${res.data.firstName} ${res.data.lastName}` : res.data.username, 
          username: res.data.username, 
          role: res.data.role, 
          id: res.data._id,
          mustChangePassword: res.data.mustChangePassword
      };
      
      setCurrentUser(userData);
      localStorage.setItem('carBookingUser', JSON.stringify(userData));
      
      // Check Force Change Password
      if (userData.mustChangePassword) {
          setChangePwdModal({ show: true, oldPassword: '', newPassword: '', confirmPassword: '', isForce: true });
      }
      
      setViewMode('dashboard');
      showToast(`ยินดีต้อนรับคุณ ${userData.name}`);
    } catch (err) { showToast(err.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ', 'error'); }
  };

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('carBookingUser'); setViewMode('dashboard'); };
  const handleShowQr = async () => { try { const res = await axios.post(`${API_URL}/generate-link-token`, { userId: currentUser.id }); setQrToken(res.data.token); setQrModal(true); } catch (err) { showToast("Error", "error"); } };
  
  // ** NEW: Change Password Submit **
  const handleChangePassword = async (e) => {
      e.preventDefault();
      if (changePwdModal.newPassword !== changePwdModal.confirmPassword) return showToast("รหัสผ่านใหม่ไม่ตรงกัน", "error");
      try {
          await axios.post(`${API_URL}/change-password`, {
              userId: currentUser.id,
              oldPassword: changePwdModal.oldPassword,
              newPassword: changePwdModal.newPassword
          });
          showToast("เปลี่ยนรหัสผ่านเรียบร้อย! กรุณาเข้าสู่ระบบใหม่");
          setChangePwdModal({ show: false, oldPassword: '', newPassword: '', confirmPassword: '', isForce: false });
          handleLogout(); // Logout to login with new password
      } catch (err) {
          showToast(err.response?.data?.message || "เกิดข้อผิดพลาด", "error");
      }
  };

  // Booking & Status Handlers
  const handleBookSubmit = async (e) => { e.preventDefault(); const start = new Date(`${formData.startDate}T${formData.startTime}`); if (start < new Date()) return showToast("❌ ห้ามจองย้อนหลัง", "error"); if (formData.startDate > formData.endDate || (formData.startDate === formData.endDate && formData.startTime >= formData.endTime)) return showToast("❌ เวลาผิด", "error"); try { await axios.post(`${API_URL}/bookings`, { userId: currentUser.username, ...formData, status: 'pending' }); showToast("✅ ส่งคำขอสำเร็จ"); setFormData({ startDate: '', startTime: '', endDate: '', endTime: '', useDriver: false, remarks: '' }); fetchData(); } catch (error) { showToast(error.response?.data?.message, "error"); } };
  const handleUpdateStatus = async (id, status, extra = {}) => { try { await axios.put(`${API_URL}/bookings/${id}`, { status, ...extra }); showToast("✅ ทำรายการสำเร็จ"); fetchData(); setRejectModal({show:false, id:''}); setStartTripModal({show:false, id:''}); setEndTripModal({show:false, id:'', startOdometer: 0}); setExtendModal({show:false, id:'', endDate:'', endTime:''}); setSelectedBooking(null); } catch (e) { showToast(e.response?.data?.message, "error"); } };
  const handleCancelBooking = (id) => { confirmAction("ยกเลิกรายการ", "ยืนยันการยกเลิก?", async () => { try { await axios.put(`${API_URL}/bookings/${id}`, { status: 'cancelled', cancelledBy: currentUser.username }); showToast("ยกเลิกแล้ว"); fetchData(); } catch (e) { showToast("Error", "error"); } }); };
  const handleApprove = async (id, carId, driverId) => { try { await axios.put(`${API_URL}/bookings/${id}`, { status: 'approved', carId, driverId }); showToast("✅ อนุมัติสำเร็จ"); fetchData(); } catch (e) { showToast(e.response?.data?.message, "error"); } };
  const handleAddUser = async (e) => { e.preventDefault(); try { await axios.post(`${API_URL}/users`, newUser); showToast("เพิ่มพนักงานแล้ว"); fetchData(); setNewUser({username:'', password:'', firstName:'', lastName:'', email:'', department:'', role:'user'}); } catch(e){showToast("Error", "error");} };
  const handleDeleteUser = (id) => { confirmAction("ลบพนักงาน", "ยืนยัน?", async () => { try{ await axios.delete(`${API_URL}/users/${id}`); fetchData(); showToast("ลบแล้ว"); }catch(e){showToast("Error", "error");} }); };
  const handleUnlinkLine = (id) => { confirmAction("ปลด LINE", "ยืนยัน?", async () => { try{ await axios.put(`${API_URL}/users/${id}`, { resetLine: true }); fetchData(); showToast("Success"); }catch(e){showToast("Error", "error");} }); };
  const handleToggleStatus = (id, currentStatus) => { confirmAction(currentStatus?'ระงับ':'เปิดใช้งาน', "ยืนยัน?", async () => { try { await axios.put(`${API_URL}/users/${id}`, { isActive: !currentStatus }); fetchData(); showToast("สำเร็จ"); } catch (e) { showToast("Error", "error"); } }); };
  const handleSaveUserEdit = async (e) => { e.preventDefault(); try { await axios.put(`${API_URL}/users/${editUserModal.data._id}`, editUserModal.data); showToast("แก้ไขแล้ว"); setEditUserModal({ show: false, data: null }); fetchData(); } catch (e) { showToast("Error", "error"); } };
  const handleSaveResetPassword = async () => { if (!resetPwdModal.newPassword) return showToast("กรอกรหัส", "error"); try { await axios.put(`${API_URL}/users/${resetPwdModal.id}`, { password: resetPwdModal.newPassword }); showToast("รีเซ็ตแล้ว (User ต้องเปลี่ยนใหม่ตอน Login)"); setResetPwdModal({ show: false, id: '', username: '', newPassword: '' }); } catch (e) { showToast("Error", "error"); } };
  const handleAddCar = async (e) => { e.preventDefault(); await axios.post(`${API_URL}/cars`, newCar); setNewCar({name:'',plate:''}); fetchData(); showToast("เพิ่มรถแล้ว"); };
  const handleDeleteCar = (id) => { confirmAction("ลบรถ", "ยืนยัน?", async () => { try { await axios.delete(`${API_URL}/cars/${id}`); fetchData(); showToast("ลบรถแล้ว"); } catch(e) { showToast(e.response?.data?.message, "error"); } }); };
  const handleAddDriver = async (e) => { e.preventDefault(); await axios.post(`${API_URL}/drivers`, newDriver); setNewDriver({name:'',phone:''}); fetchData(); showToast("เพิ่มคนขับแล้ว"); };
  const handleDeleteDriver = (id) => { confirmAction("ลบคนขับ", "ยืนยัน?", async () => { try { await axios.delete(`${API_URL}/drivers/${id}`); fetchData(); showToast("ลบคนขับแล้ว"); } catch(e) { showToast(e.response?.data?.message, "error"); } }); };
  const openBlockModal = (type, item) => { setBlockModal({ show: true, type, id: item._id, name: item.name }); setBlockData({ startDate: '', startTime: '', endDate: '', endTime: '', remarks: type === 'car' ? 'ซ่อม' : 'ลา' }); };
  const handleBlockSubmit = async (e) => { e.preventDefault(); try { await axios.post(`${API_URL}/bookings`, { userId: 'ADMIN', startDate: blockData.startDate, startTime: blockData.startTime, endDate: blockData.endDate, endTime: blockData.endTime, remarks: `[ปิด] ${blockData.remarks}`, status: 'maintenance', useDriver: false, carId: blockModal.type==='car'?blockModal.id:null, driverId: blockModal.type==='driver'?blockModal.id:null }); showToast("บันทึกแล้ว"); setBlockModal({...blockModal,show:false}); fetchData(); } catch(e){showToast(e.response?.data?.message, "error");} };
  const openScheduleModal = (type, item) => { setScheduleModal({ show: true, type, id: item._id, name: item.name }); };
  const getScheduleData = () => bookings.filter(b => (scheduleModal.type==='car'?b.carId?._id:b.driverId?._id) === scheduleModal.id).sort((a,b)=>new Date(b.startDate)-new Date(a.startDate));
  const handleDeleteBooking = (id) => { confirmAction("ลบรายการ", "ยืนยัน?", async () => { try { await axios.delete(`${API_URL}/bookings/${id}`); fetchData(); setSelectedBooking(null); showToast("ลบแล้ว"); } catch(e) { showToast("Error", "error"); } }); };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate); const monthEnd = endOfMonth(monthStart); const startDate = startOfWeek(monthStart); const endDate = endOfWeek(monthEnd);
    const rows = []; let days = []; let day = startDate; const today = startOfToday();
    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            const formattedDate = format(day, "d"); const cloneDay = day; const isCurrentMonth = isSameMonth(day, monthStart); const isToday = isSameDay(day, new Date());
            const isPast = currentUser.role === 'user' && isBefore(cloneDay, today);
            const dayBookings = bookings.filter(b => { const bStart = parseISO(b.startDate); const bEnd = parseISO(b.endDate); return (cloneDay >= bStart && cloneDay <= bEnd) || isSameDay(cloneDay, bStart) || isSameDay(cloneDay, bEnd); });
            days.push(<div key={day} className={`min-h-[120px] p-1 border-r border-b transition-colors flex flex-col relative group ${isPast ? "bg-gray-100 text-gray-300 cursor-not-allowed" : (!isCurrentMonth ? "bg-gray-50/50 text-gray-300" : "bg-white hover:bg-gray-50")}`}><div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full self-end mb-1 ${isToday ? "bg-blue-600 text-white shadow-md" : ""}`}>{formattedDate}</div><div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar px-1">{!isPast && dayBookings.slice(0, 3).map(b => {let borderClass = 'border-l-gray-400'; if (b.status === 'approved') borderClass = 'border-l-blue-500'; if (b.status === 'active') borderClass = 'border-l-green-500'; if (b.status === 'maintenance') borderClass = 'border-l-red-500'; if (b.status === 'rejected') borderClass = 'border-l-red-400'; if (b.status === 'cancelled') borderClass = 'border-l-gray-300'; return (<div key={b._id} onClick={() => !isPast && setSelectedBooking(b)} className={`text-[10px] p-1.5 rounded border-l-[3px] shadow-sm cursor-pointer hover:scale-[1.02] flex flex-col gap-0.5 bg-white ${borderClass}`}><div className="flex justify-between items-center font-bold text-gray-700"><span className="flex items-center gap-1">{b.startTime} {b.status === 'maintenance' && <AlertTriangle size={10}/>}</span></div><div className="truncate font-medium flex items-center gap-1 text-gray-600">{b.status === 'maintenance' ? b.remarks : (<>{b.carId ? <Car size={10}/> : <User size={10}/>}<span>{b.carId ? b.carId.name : (b.driverId ? b.driverId.name : 'ไม่ระบุ')}</span></>)}</div></div>);})}{!isPast && dayBookings.length > 3 && <div className="text-[9px] text-center text-gray-400 font-medium">+ {dayBookings.length - 3} อื่นๆ</div>}</div></div>);
            day = addDays(day, 1);
        }
        rows.push(<div key={day} className="grid grid-cols-7">{days}</div>); days = [];
    }
    return <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden bg-white"><div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">{["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((d, i) => (<div key={d} className={`p-2 text-center text-xs font-bold uppercase ${i===0||i===6?'text-red-500':'text-gray-500'}`}>{d}</div>))}</div>{rows}</div>;
  };

  const ToastNotification = () => (<div className={`fixed top-5 right-5 z-[100] transform transition-all duration-300 ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}><div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{toast.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}<span className="font-medium text-sm">{toast.message}</span><button onClick={()=>setToast({...toast, show:false})} className="ml-2 opacity-50 hover:opacity-100"><X size={16}/></button></div></div>);
  const ConfirmDialog = () => (confirmDialog.show && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform scale-100"><h3 className="text-lg font-bold text-gray-800 mb-2">{confirmDialog.title}</h3><p className="text-gray-600 text-sm mb-6">{confirmDialog.message}</p><div className="flex justify-end gap-3"><button onClick={()=>setConfirmDialog({...confirmDialog, show:false})} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium">ยกเลิก</button><button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow-md">ยืนยัน</button></div></div></div>));

  if (!currentUser) return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"><ToastNotification /><div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center"><div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Car className="text-blue-600" size={32} /></div><h1 className="text-2xl font-bold mb-2 text-gray-800">Corporate Car Booking</h1><form onSubmit={handleLoginSubmit} className="space-y-4 text-left mt-6"><div><label className="text-sm font-bold text-gray-600">รหัสพนักงาน (Username)</label><input type="text" className="w-full border p-3 rounded-lg mt-1" value={loginData.username} onChange={e=>setLoginData({...loginData, username:e.target.value})} required/></div><div><label className="text-sm font-bold text-gray-600">รหัสผ่าน (Password)</label><input type="password" className="w-full border p-3 rounded-lg mt-1" value={loginData.password} onChange={e=>setLoginData({...loginData, password:e.target.value})} required/></div><button className="w-full bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 font-bold shadow-lg transition">เข้าสู่ระบบ</button></form><div className="mt-6 text-xs text-gray-400 bg-gray-50 p-3 rounded border border-dashed">Demo: admin/123 | user/123</div></div></div>);

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10 relative">
      <ToastNotification /><ConfirmDialog />
      <nav className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3 font-bold text-xl text-gray-800"><Car className="text-blue-600"/> <span>{currentUser.role === 'admin' ? 'Admin Panel' : 'User Dashboard'}</span></div>
        <div className="flex items-center gap-4">
            <button onClick={()=>setChangePwdModal({show:true, oldPassword:'', newPassword:'', confirmPassword:'', isForce:false})} className="flex items-center gap-2 text-xs bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200"><Key size={14}/> เปลี่ยนรหัส</button>
            <button onClick={handleShowQr} className="flex items-center gap-2 text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-full border border-green-200 font-bold"><QrCode size={14}/> LINE</button>
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full"><User size={16}/> {currentUser.name}</span>
            <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><LogOut size={20} /></button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {currentUser.role === 'admin' && (<div className="flex gap-2 mb-6 overflow-x-auto"><button onClick={()=>setViewMode('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode==='dashboard'?'bg-blue-600 text-white shadow':'bg-white text-gray-600 border'}`}><LayoutDashboard size={16}/> ภาพรวม</button><button onClick={()=>setViewMode('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode==='calendar'?'bg-blue-600 text-white shadow':'bg-white text-gray-600 border'}`}><CalendarIcon size={16}/> ปฏิทินงาน</button><button onClick={()=>setViewMode('users')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode==='users'?'bg-blue-600 text-white shadow':'bg-white text-gray-600 border'}`}><Users size={16}/> ผู้ใช้งาน</button></div>)}
        {currentUser.role === 'user' && (<div className="flex gap-2 mb-6 overflow-x-auto"><button onClick={()=>setViewMode('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode==='dashboard'?'bg-blue-600 text-white shadow':'bg-white text-gray-600 border'}`}><LayoutDashboard size={16}/> จองรถ (Booking)</button><button onClick={()=>setViewMode('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode==='calendar'?'bg-blue-600 text-white shadow':'bg-white text-gray-600 border'}`}><CalendarIcon size={16}/> ปฏิทินงาน</button></div>)}

        {currentUser.role === 'admin' && viewMode === 'dashboard' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border"><h3 className="font-bold mb-4 text-gray-700 flex items-center gap-2"><ChartIcon size={20}/> สถิติการใช้รถ</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.carStats} margin={{top: 5, right: 10, left: 0, bottom: 5}}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="count" fill="#3b82f6" name="จำนวนงาน" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border"><h3 className="font-bold mb-4 text-gray-700 flex items-center gap-2"><Users size={20}/> สถิติคนขับ</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.driverStats} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="name" type="category" width={80} style={{fontSize: '10px'}} /><Tooltip /><Bar dataKey="count" fill="#10b981" name="งานขับ" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border"><h3 className="font-bold mb-4 text-gray-700 flex items-center gap-2"><ChartIcon size={20}/> สัดส่วนตามแผนก</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.deptStats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="count" label>{stats.deptStats.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border"><h3 className="font-bold mb-4 text-lg flex items-center gap-2"><Clock className="text-blue-500"/> รายการรออนุมัติ</h3>{bookings.filter(b => b.status === 'pending').length === 0 && <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">ไม่มีรายการรออนุมัติ</div>}<div className="space-y-3">{bookings.filter(b => b.status === 'pending').map(b => (<div key={b._id} className="border p-4 rounded-xl bg-white flex justify-between items-start shadow-sm hover:border-blue-300 transition"><div><h4 className="font-bold text-gray-800">{b.remarks}</h4><p className="text-sm text-gray-500 mt-1">{b.startDate} {b.startTime} - {b.endDate} {b.endTime}</p><div className="flex items-center gap-2 mt-2"><span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">User: {b.userId}</span>{b.useDriver && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">ต้องการคนขับ</span>}</div></div><div className="flex flex-col items-end gap-2"><div className="flex gap-2"><select id={`c-${b._id}`} className="border p-2 rounded text-sm w-32 bg-gray-50"><option value="">เลือก รถ</option>{cars.map(c=><option key={c._id} value={c._id} disabled={!!checkAvailability('car',c._id,b.startDate,b.startTime,b.endDate,b.endTime)} className={checkAvailability('car',c._id,b.startDate,b.startTime,b.endDate,b.endTime)?'text-gray-300':''}>{c.name}</option>)}</select><select id={`d-${b._id}`} className="border p-2 rounded text-sm w-32 bg-gray-50" disabled={!b.useDriver}><option value="">เลือก คนขับ</option>{drivers.map(d=><option key={d._id} value={d._id} disabled={!!checkAvailability('driver',d._id,b.startDate,b.startTime,b.endDate,b.endTime)} className={checkAvailability('driver',d._id,b.startDate,b.startTime,b.endDate,b.endTime)?'text-gray-300':''}>{d.name}</option>)}</select></div><div className="flex gap-2"><button onClick={()=>setRejectModal({show:true, id:b._id})} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100">ไม่อนุมัติ</button><button onClick={()=>{ const cId=document.getElementById(`c-${b._id}`).value; const dId=document.getElementById(`d-${b._id}`).value; if(!cId)return showToast("กรุณาเลือกรถก่อนอนุมัติ", "error"); handleApprove(b._id, cId, dId||null); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow">อนุมัติ</button></div></div></div>))}</div></div>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden border-l-4 border-l-red-500"><div className="bg-red-50 px-6 py-3 font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={18}/> รายการปิดปรับปรุง / ลางาน (Unavailable)</div><div className="p-4 space-y-2">{bookings.filter(b => b.status === 'maintenance').length === 0 && <p className="text-gray-400 text-center text-sm py-2">ไม่มีรายการแจ้งซ่อม/ลา</p>}{bookings.filter(b => b.status === 'maintenance').map(b => (<div key={b._id} className="flex justify-between items-center bg-white p-3 rounded border border-gray-100 shadow-sm"><div className="text-sm text-gray-700"><span className="font-bold text-red-600">{b.remarks}</span> | {b.carId ? `🚗 ${b.carId.name}` : `👤 ${b.driverId?.name}`} | {b.startDate} {b.startTime} - {b.endDate} {b.endTime}</div><button onClick={()=>handleDeleteBooking(b._id)} className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50">ยกเลิก</button></div>))}</div></div>
                <div className="grid md:grid-cols-2 gap-6"><div className="bg-white p-6 rounded-xl shadow-sm border"><h3 className="font-bold mb-4 text-gray-800">จัดการรถ</h3><form onSubmit={handleAddCar} className="flex gap-2 mb-4"><input placeholder="ชื่อรุ่น" className="border p-2 rounded text-sm flex-1" value={newCar.name} onChange={e=>setNewCar({...newCar, name:e.target.value})}/><input placeholder="ทะเบียน" className="border p-2 rounded text-sm w-24" value={newCar.plate} onChange={e=>setNewCar({...newCar, plate:e.target.value})}/><button className="bg-blue-600 text-white p-2 rounded"><Plus/></button></form><div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">{cars.map(c => (<div key={c._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"><div><p className="font-bold text-sm">{c.name}</p><p className="text-xs text-gray-500">{c.plate}</p></div><div className="flex gap-1"><button onClick={()=>openScheduleModal('car', c)} className="text-blue-500 p-1.5 hover:bg-blue-100 rounded"><CalendarIcon size={16}/></button><button onClick={()=>openBlockModal('car', c)} className="text-orange-400 p-1.5 hover:bg-orange-100 rounded"><CalendarOff size={16}/></button><button onClick={()=>handleDeleteCar(c._id)} className="text-gray-400 hover:text-red-500 p-1.5"><Trash2 size={16}/></button></div></div>))}</div></div><div className="bg-white p-6 rounded-xl shadow-sm border"><h3 className="font-bold mb-4 text-gray-800">จัดการคนขับ</h3><form onSubmit={handleAddDriver} className="flex gap-2 mb-4"><input placeholder="ชื่อ" className="border p-2 rounded text-sm flex-1" value={newDriver.name} onChange={e=>setNewDriver({...newDriver, name:e.target.value})}/><input placeholder="เบอร์" className="border p-2 rounded text-sm w-32" value={newDriver.phone} onChange={e=>setNewDriver({...newDriver, phone:e.target.value})}/><button className="bg-green-600 text-white p-2 rounded"><Plus/></button></form><div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">{drivers.map(d => (<div key={d._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"><div><p className="font-bold text-sm">{d.name}</p><p className="text-xs text-gray-500">{d.phone}</p></div><div className="flex gap-1"><button onClick={()=>openScheduleModal('driver', d)} className="text-blue-500 p-1.5 hover:bg-blue-100 rounded"><CalendarIcon size={16}/></button><button onClick={()=>openBlockModal('driver', d)} className="text-orange-400 p-1.5 hover:bg-orange-100 rounded"><CalendarOff size={16}/></button><button onClick={()=>handleDeleteDriver(d._id)} className="text-gray-400 hover:text-red-500 p-1.5"><Trash2 size={16}/></button></div></div>))}</div></div></div>
            </div>
        )}

        {viewMode === 'calendar' && currentUser && (<div className="bg-white p-6 rounded-xl shadow-sm border"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl flex items-center gap-2"><CalendarIcon className="text-blue-600"/> ปฏิทินงาน</h3><div className="flex items-center gap-4 bg-gray-50 px-4 py-1 rounded-full border"><button onClick={()=>setCurrentDate(subMonths(currentDate, 1))} disabled={currentUser.role === 'user' && isSameMonth(currentDate, new Date())} className={`p-1 rounded-full ${currentUser.role === 'user' && isSameMonth(currentDate, new Date()) ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-white'}`}><ChevronLeft/></button><span className="font-bold w-32 text-center">{format(currentDate, "MMMM yyyy", { locale: th })}</span><button onClick={()=>setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-white rounded-full"><ChevronRight/></button></div></div>{renderCalendar()}</div>)}
        
        {currentUser.role === 'admin' && viewMode === 'users' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Users/> จัดการผู้ใช้งาน</h3>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-6 bg-gray-50 p-4 rounded-lg border">
                    <input placeholder="รหัสพนักงาน" className="border p-2 rounded text-sm" value={newUser.username} onChange={e=>setNewUser({...newUser, username:e.target.value})} required/>
                    <input placeholder="ชื่อจริง" className="border p-2 rounded text-sm" value={newUser.firstName} onChange={e=>setNewUser({...newUser, firstName:e.target.value})} required/>
                    <input placeholder="นามสกุล" className="border p-2 rounded text-sm" value={newUser.lastName} onChange={e=>setNewUser({...newUser, lastName:e.target.value})} required/>
                    <input placeholder="อีเมล" type="email" className="border p-2 rounded text-sm" value={newUser.email} onChange={e=>setNewUser({...newUser, email:e.target.value})} required/>
                    <input placeholder="แผนก" className="border p-2 rounded text-sm" value={newUser.department} onChange={e=>setNewUser({...newUser, department:e.target.value})} required/>
                    <div className="flex gap-2"><input placeholder="Password" type="password" className="border p-2 rounded text-sm w-full" value={newUser.password} onChange={e=>setNewUser({...newUser, password:e.target.value})} required/><button className="bg-green-600 text-white px-4 rounded text-sm font-bold min-w-[60px]">เพิ่ม</button></div>
                </form>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs"><tr><th className="p-3">รหัส</th><th className="p-3">ชื่อ-นามสกุล</th><th className="p-3">แผนก</th><th className="p-3">สถานะ LINE</th><th className="p-3">ใช้งาน</th><th className="p-3 text-right">จัดการ</th></tr></thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u._id} className={`border-b hover:bg-gray-50 ${!u.isActive ? 'bg-gray-100 opacity-60' : ''}`}>
                                    <td className="p-3 font-medium">{u.username}</td>
                                    <td className="p-3">{u.firstName} {u.lastName}</td>
                                    <td className="p-3"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold">{u.department}</span></td>
                                    <td className="p-3">{u.lineUserId ? <span className="text-green-600 flex items-center gap-1 font-bold"><CheckCircle size={12}/> Linked</span> : <span className="text-gray-400 text-xs">Unlinked</span>}</td>
                                    <td className="p-3"><button onClick={()=>handleToggleStatus(u._id, u.isActive)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${u.isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>{u.isActive ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>} {u.isActive ? 'Active' : 'Inactive'}</button></td>
                                    <td className="p-3 text-right flex justify-end gap-2">
                                        <button onClick={()=>setEditUserModal({show:true, data:u})} className="text-blue-500 bg-blue-50 p-1.5 rounded hover:bg-blue-100" title="แก้ไข"><EditIcon size={16}/></button>
                                        <button onClick={()=>setResetPwdModal({show:true, id:u._id, username:u.username, newPassword:''})} className="text-orange-500 bg-orange-50 p-1.5 rounded hover:bg-orange-100" title="เปลี่ยนรหัส"><Key size={16}/></button>
                                        {u.lineUserId && <button onClick={()=>handleUnlinkLine(u._id)} className="text-gray-500 bg-gray-100 p-1.5 rounded hover:bg-gray-200" title="ปลด LINE"><QrCode size={16}/></button>}
                                        <button onClick={()=>handleDeleteUser(u._id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100" title="ลบ"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {currentUser.role === 'user' && viewMode === 'dashboard' && (
            <div className="grid md:grid-cols-12 gap-8">
                <div className="md:col-span-4 bg-white p-6 rounded-2xl shadow-sm border h-fit sticky top-24"><h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-800"><Plus className="bg-blue-100 text-blue-600 rounded p-1" size={28} /> จองรถใหม่</h2><form onSubmit={handleBookSubmit} className="space-y-5"><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500 mb-1 block">เริ่มวันที่</label><input type="date" className="w-full border-gray-200 bg-gray-50 rounded-lg text-sm p-2.5" value={formData.startDate} onChange={e=>setFormData({...formData, startDate: e.target.value})}/></div><div><label className="text-xs font-bold text-gray-500 mb-1 block">เวลา</label><input type="time" className="w-full border-gray-200 bg-gray-50 rounded-lg text-sm p-2.5" value={formData.startTime} onChange={e=>setFormData({...formData, startTime: e.target.value})}/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500 mb-1 block">ถึงวันที่</label><input type="date" className="w-full border-gray-200 bg-gray-50 rounded-lg text-sm p-2.5" value={formData.endDate} onChange={e=>setFormData({...formData, endDate: e.target.value})}/></div><div><label className="text-xs font-bold text-gray-500 mb-1 block">เวลา</label><input type="time" className="w-full border-gray-200 bg-gray-50 rounded-lg text-sm p-2.5" value={formData.endTime} onChange={e=>setFormData({...formData, endTime: e.target.value})}/></div></div></div><div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"><input type="checkbox" id="driverCheck" className="w-4 h-4" checked={formData.useDriver} onChange={e=>setFormData({...formData, useDriver: e.target.checked})}/><label htmlFor="driverCheck" className="text-sm font-medium text-gray-700">ต้องการคนขับรถ</label></div><div><label className="text-xs font-bold text-gray-500 mb-1 block">รายละเอียด</label><textarea className="w-full border-gray-200 bg-gray-50 rounded-lg text-sm p-3" rows="3" value={formData.remarks} onChange={e=>setFormData({...formData, remarks: e.target.value})}></textarea></div><button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-xl font-semibold hover:shadow-lg transition">ยืนยันการจอง</button></form></div>
                <div className="md:col-span-8"><div className="bg-white p-6 rounded-2xl shadow-sm border"><h3 className="font-bold mb-4 text-lg flex items-center gap-2"><List/> ประวัติการจอง</h3><div className="space-y-3">{bookings.filter(b => b.userId === currentUser.username).map(b => (<div key={b._id} className="border p-4 rounded-xl bg-white flex justify-between items-start hover:border-blue-200 transition shadow-sm"><div><div className="mb-2">{getStatusBadge(b.status)}</div><p className="font-bold text-gray-800">{b.remarks}</p><p className="text-xs text-gray-500 mt-1">{b.startDate} {b.startTime} - {b.endDate} {b.endTime}</p>{b.carId && <p className="text-xs text-blue-600 mt-1 bg-blue-50 w-fit px-2 py-1 rounded">🚗 {b.carId.name} | 👤 {b.driverId?.name || 'ขับเอง'}</p>}{b.rejectionReason && <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">⚠️ เหตุผล: {b.rejectionReason}</p>}</div><div className="flex flex-col gap-2 items-end">{b.status === 'approved' && (<button onClick={() => { if (canStartTrip(b)) { setStartTripModal({show:true, id:b._id}); } else { showToast(`ยังไม่ถึงเวลาจอง (เริ่มได้เมื่อ ${b.startDate} ${b.startTime})`, "error"); } }} className={`px-4 py-1.5 rounded-lg text-xs font-bold shadow transition text-white ${canStartTrip(b) ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"}`}>เริ่มเดินทาง</button>)}{b.status === 'active' && <button onClick={()=>setEndTripModal({show:true, id:b._id, startOdometer: b.startOdometer})} className="bg-gray-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-700 shadow">คืนรถ</button>}{(b.status === 'pending' || b.status === 'approved') && <button onClick={()=>handleCancelBooking(b._id)} className="text-red-500 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">ยกเลิก</button>}{(b.status === 'approved' || b.status === 'active') && <button onClick={()=>setExtendModal({show:true, id:b._id, endDate:b.endDate, endTime:b.endTime})} className="text-orange-500 text-xs underline hover:text-orange-700 mt-1">ขอต่อเวลา</button>}</div></div>))}</div></div></div>
            </div>
        )}

        {/* --- MODALS (Popups) --- */}
        
        {/* NEW: Change Password Modal */}
        {changePwdModal.show && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 relative">
                    {/* Force change cannot be closed */}
                    {!changePwdModal.isForce && <button onClick={()=>setChangePwdModal({...changePwdModal, show:false})} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>}
                    
                    <div className="text-center mb-6">
                        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Key className="text-blue-600" size={32} /></div>
                        <h3 className="text-xl font-bold text-gray-800">
                            {changePwdModal.isForce ? 'บังคับเปลี่ยนรหัสผ่าน' : 'เปลี่ยนรหัสผ่าน'}
                        </h3>
                        {changePwdModal.isForce && <p className="text-sm text-red-500 mt-2">Admin ได้ทำการรีเซ็ตรหัสผ่านของคุณ<br/>กรุณาตั้งรหัสผ่านใหม่เพื่อใช้งานต่อ</p>}
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">รหัสผ่านเดิม</label>
                            <input type="password" required className="w-full border p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                                value={changePwdModal.oldPassword} onChange={e=>setChangePwdModal({...changePwdModal, oldPassword:e.target.value})} placeholder="Old Password"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">รหัสผ่านใหม่</label>
                            <input type="password" required className="w-full border p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                                value={changePwdModal.newPassword} onChange={e=>setChangePwdModal({...changePwdModal, newPassword:e.target.value})} placeholder="New Password"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">ยืนยันรหัสผ่านใหม่</label>
                            <input type="password" required className="w-full border p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                                value={changePwdModal.confirmPassword} onChange={e=>setChangePwdModal({...changePwdModal, confirmPassword:e.target.value})} placeholder="Confirm Password"/>
                        </div>
                        <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg mt-2">
                            ยืนยันการเปลี่ยนรหัส
                        </button>
                    </form>
                </div>
            </div>
        )}

        {rejectModal.show && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"><div className="bg-white p-6 rounded-xl shadow-xl w-80"><h3 className="font-bold mb-3 text-red-600">ระบุเหตุผลไม่อนุมัติ</h3><textarea id="reject-reason" className="w-full border p-3 rounded-lg text-sm mb-4 outline-none focus:ring-2 focus:ring-red-500" placeholder="เช่น รถไม่ว่าง, ข้อมูลไม่ครบ" rows="3"></textarea><div className="flex justify-end gap-2"><button onClick={()=>setRejectModal({show:false, id:''})} className="text-gray-500 text-sm hover:text-gray-700 px-3">ยกเลิก</button><button onClick={()=>handleUpdateStatus(rejectModal.id, 'rejected', { rejectionReason: document.getElementById('reject-reason').value })} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700">ยืนยัน</button></div></div></div>)}
        {startTripModal.show && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"><div className="bg-white p-6 rounded-xl shadow-xl w-80"><h3 className="font-bold mb-2 flex items-center gap-2 text-green-700"><PlayCircle size={20}/> เริ่มเดินทาง</h3><p className="text-xs text-gray-500 mb-3">กรุณากรอกเลขไมล์ปัจจุบันก่อนออกรถ</p><input id="start-odo" type="number" className="w-full border p-3 rounded-lg text-sm mb-4 outline-none focus:ring-2 focus:ring-green-500" placeholder="เช่น 120500"/><div className="flex justify-end gap-2"><button onClick={()=>setStartTripModal({show:false, id:''})} className="text-gray-500 text-sm hover:text-gray-700 px-3">ยกเลิก</button><button onClick={()=>{const val=document.getElementById('start-odo').value; if(!val)return showToast("กรุณากรอกเลขไมล์", "error"); handleUpdateStatus(startTripModal.id, 'active', { startOdometer: val });}} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700">บันทึก & ไป</button></div></div></div>)}
        {endTripModal.show && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"><div className="bg-white p-6 rounded-xl shadow-xl w-80"><h3 className="font-bold mb-2 flex items-center gap-2 text-gray-700"><StopCircle size={20}/> คืนรถ (สิ้นสุดงาน)</h3><p className="text-xs text-gray-500 mb-3">เลขไมล์เริ่มต้น: <strong>{endTripModal.startOdometer}</strong></p><p className="text-xs text-gray-500 mb-1">กรุณากรอกเลขไมล์สิ้นสุด</p><input id="end-odo" type="number" className="w-full border p-3 rounded-lg text-sm mb-4 outline-none focus:ring-2 focus:ring-gray-500" placeholder="เช่น 120600"/><div className="flex justify-end gap-2"><button onClick={()=>setEndTripModal({show:false, id:'', startOdometer:0})} className="text-gray-500 text-sm hover:text-gray-700 px-3">ยกเลิก</button><button onClick={()=>{const val = document.getElementById('end-odo').value; if(!val) return showToast("กรุณากรอกเลขไมล์สิ้นสุด", "error"); if(Number(val) <= endTripModal.startOdometer) return showToast("เลขไมล์สิ้นสุดต้องมากกว่าเริ่มต้น", "error"); handleUpdateStatus(endTripModal.id, 'completed', { endOdometer: val });}} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black">ยืนยันคืนรถ</button></div></div></div>)}
        {extendModal.show && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"><div className="bg-white p-6 rounded-xl shadow-xl w-80"><h3 className="font-bold mb-2 text-orange-600 flex items-center gap-2"><Clock/> ขอต่อเวลา</h3><p className="text-xs text-gray-500 mb-4">เลือกเวลาสิ้นสุดใหม่ (ระบบจะเช็คคิวให้อัตโนมัติ)</p><div className="space-y-3 mb-4"><input type="date" className="w-full border p-2.5 rounded-lg text-sm" value={extendModal.endDate} onChange={e=>setExtendModal({...extendModal, endDate:e.target.value})}/><input type="time" className="w-full border p-2.5 rounded-lg text-sm" value={extendModal.endTime} onChange={e=>setExtendModal({...extendModal, endTime:e.target.value})}/></div><div className="flex justify-end gap-2"><button onClick={()=>setExtendModal({show:false, id:'', endDate:'', endTime:''})} className="text-gray-500 text-sm px-3">ยกเลิก</button><button onClick={()=>handleUpdateStatus(extendModal.id, 'approved', { extendToDate: extendModal.endDate, extendToTime: extendModal.endTime })} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-600">ตรวจสอบ & บันทึก</button></div></div></div>)}
        {blockModal.show && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md"><div className="flex justify-between items-center mb-6 pb-4 border-b"><h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><div className="bg-red-100 p-2 rounded-full"><AlertTriangle size={24} className="text-red-600"/></div> แจ้งหยุดงาน</h3><button onClick={()=>setBlockModal({...blockModal, show:false})}><X size={20} className="text-gray-400 hover:text-gray-600"/></button></div><p className="mb-4 bg-gray-50 p-3 rounded">สำหรับ: <strong>{blockModal.name}</strong></p><form onSubmit={handleBlockSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold">เริ่ม</label><input required type="date" className="w-full border p-2 rounded" value={blockData.startDate} onChange={e=>setBlockData({...blockData, startDate: e.target.value})}/></div><div><label className="text-xs font-bold">เวลา</label><input required type="time" className="w-full border p-2 rounded" value={blockData.startTime} onChange={e=>setBlockData({...blockData, startTime: e.target.value})}/></div></div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold">สิ้นสุด</label><input required type="date" className="w-full border p-2 rounded" value={blockData.endDate} onChange={e=>setBlockData({...blockData, endDate: e.target.value})}/></div><div><label className="text-xs font-bold">เวลา</label><input required type="time" className="w-full border p-2 rounded" value={blockData.endTime} onChange={e=>setBlockData({...blockData, endTime: e.target.value})}/></div></div><div><label className="text-xs font-bold">สาเหตุ</label><input required className="w-full border p-2 rounded" value={blockData.remarks} onChange={e=>setBlockData({...blockData, remarks: e.target.value})}/></div><button className="w-full bg-red-600 text-white p-3 rounded hover:bg-red-700">บันทึก</button></form></div></div>)}
        {scheduleModal.show && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"><div className="flex justify-between items-center mb-4 border-b pb-4"><h3 className="font-bold text-xl text-gray-800">ตารางงาน: {scheduleModal.name}</h3><button onClick={()=>setScheduleModal({...scheduleModal, show:false})}><X size={20}/></button></div><div className="overflow-y-auto flex-1 space-y-3 pr-2 custom-scrollbar">{getScheduleData().length === 0 ? <div className="text-center text-gray-400 py-12">ว่าง!</div> : getScheduleData().map(b => (<div key={b._id} className="p-4 rounded-xl border text-sm flex justify-between items-start bg-white border-gray-200 hover:shadow-sm transition"><div><div className="mb-2">{getStatusBadge(b.status)}</div><p className="font-bold text-gray-800">{b.remarks}</p><p className="text-xs text-gray-500 mt-1">{b.startDate} {b.startTime} - {b.endDate} {b.endTime}</p></div></div>))}</div></div></div>)}
        {qrModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center relative"><button onClick={()=>setQrModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button><h3 className="text-xl font-bold text-green-600 mb-2">Scan เพื่อรับแจ้งเตือน</h3><div className="flex justify-center mb-6 mt-4"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://line.me/R/oaMessage/${LINE_BOT_ID}/?!link ${qrToken}`)}`} alt="QR Code" className="border-4 border-green-100 rounded-lg"/></div><div className="bg-gray-50 p-3 rounded text-xs text-gray-400 break-all">หรือพิมพ์: !link {qrToken}</div></div></div>)}
        {selectedBooking && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-blue-500 transform transition-all"><div className="flex justify-between items-start mb-6"><div><h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><Info className="text-blue-500"/> รายละเอียด</h3><p className="text-sm text-gray-500 mt-1">ID: {selectedBooking._id.slice(-6)}</p></div><button onClick={()=>setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1 rounded-full"><X size={20}/></button></div><div className="space-y-4"><div className="flex justify-center pb-4">{getStatusBadge(selectedBooking.status)}</div><div className="bg-blue-50 p-4 rounded-xl"><p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">หมายเหตุ</p><p className="text-lg font-bold text-gray-800">{selectedBooking.remarks}</p></div><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-gray-500 mb-1">เริ่ม</p><p className="font-semibold text-gray-800">{selectedBooking.startDate}</p><p className="text-sm text-blue-600 font-bold">{selectedBooking.startTime}</p></div><div><p className="text-xs text-gray-500 mb-1">สิ้นสุด</p><p className="font-semibold text-gray-800">{selectedBooking.endDate}</p><p className="text-sm text-blue-600 font-bold">{selectedBooking.endTime}</p></div></div><div className="border-t pt-4 flex flex-col gap-2"><div className="flex justify-between"><span className="text-gray-500 text-sm">รถ:</span><span className="font-bold text-gray-800">{selectedBooking.carId ? selectedBooking.carId.name : '-'}</span></div><div className="flex justify-between"><span className="text-gray-500 text-sm">คนขับ:</span><span className="font-bold text-gray-800">{selectedBooking.driverId ? selectedBooking.driverId.name : '-'}</span></div><div className="flex justify-between"><span className="text-gray-500 text-sm">ผู้จอง:</span><span className="font-bold text-gray-800">{selectedBooking.userId}</span></div></div><div className="mt-6 pt-4 border-t flex justify-end">{selectedBooking.status === 'maintenance' ? <button onClick={()=>{handleDeleteBooking(selectedBooking._id); setSelectedBooking(null);}} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700">ยกเลิก (เปิดใช้งาน)</button> : (currentUser.role === 'admin' && selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed') ? <button onClick={()=>handleCancelBooking(selectedBooking._id)} className="w-full bg-red-100 text-red-600 py-3 rounded-xl font-bold hover:bg-red-200 border border-red-200">ยกเลิกรายการจอง</button> : <button onClick={()=>setSelectedBooking(null)} className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200">ปิด</button>}</div></div></div></div>)}
        {editUserModal.show && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"><div className="bg-white p-6 rounded-xl shadow-xl w-96"><h3 className="font-bold mb-4 text-blue-600 flex items-center gap-2"><EditIcon size={18}/> แก้ไขข้อมูลผู้ใช้</h3><form onSubmit={handleSaveUserEdit} className="space-y-3"><div><label className="text-xs">รหัสพนักงาน</label><input disabled className="w-full border p-2 rounded bg-gray-100 text-gray-500 text-sm" value={editUserModal.data.username}/></div><div className="grid grid-cols-2 gap-2"><div><label className="text-xs">ชื่อ</label><input className="w-full border p-2 rounded text-sm" value={editUserModal.data.firstName} onChange={e=>setEditUserModal({...editUserModal, data:{...editUserModal.data, firstName:e.target.value}})}/></div><div><label className="text-xs">นามสกุล</label><input className="w-full border p-2 rounded text-sm" value={editUserModal.data.lastName} onChange={e=>setEditUserModal({...editUserModal, data:{...editUserModal.data, lastName:e.target.value}})}/></div></div><div><label className="text-xs">แผนก</label><input className="w-full border p-2 rounded text-sm" value={editUserModal.data.department} onChange={e=>setEditUserModal({...editUserModal, data:{...editUserModal.data, department:e.target.value}})}/></div><div><label className="text-xs">อีเมล</label><input className="w-full border p-2 rounded text-sm" value={editUserModal.data.email} onChange={e=>setEditUserModal({...editUserModal, data:{...editUserModal.data, email:e.target.value}})}/></div><div className="flex justify-end gap-2 mt-4"><button type="button" onClick={()=>setEditUserModal({show:false, data:null})} className="px-3 py-2 rounded text-gray-500 text-sm hover:bg-gray-100">ยกเลิก</button><button className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">บันทึก</button></div></form></div></div>)}
        {resetPwdModal.show && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"><div className="bg-white p-6 rounded-xl shadow-xl w-80"><h3 className="font-bold mb-2 text-orange-600 flex items-center gap-2"><Key size={18}/> รีเซ็ตรหัสผ่าน</h3><p className="text-xs text-gray-500 mb-4">สำหรับ User: <strong>{resetPwdModal.username}</strong></p><input type="password" placeholder="รหัสผ่านใหม่" className="w-full border p-3 rounded-lg text-sm mb-4 outline-none focus:ring-2 focus:ring-orange-500" value={resetPwdModal.newPassword} onChange={e=>setResetPwdModal({...resetPwdModal, newPassword:e.target.value})}/><div className="flex justify-end gap-2"><button onClick={()=>setResetPwdModal({show:false, id:'', username:'', newPassword:''})} className="text-gray-500 text-sm hover:text-gray-700 px-3">ยกเลิก</button><button onClick={handleSaveResetPassword} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-600">เปลี่ยนรหัส</button></div></div></div>)}

      </div>
    </div>
  );
};

export default App;