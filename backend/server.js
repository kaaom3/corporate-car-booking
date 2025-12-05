/**
 * Corporate Car Booking Backend (Final Production Ready)
 * Features: Timezone Fixed + Flex Message + Extension + Expense Tracking + CORS Fixed
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// ✅ FIX CORS
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// --- CONFIG ---
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carBookingDB';
const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN; 
// ⚠️ เปลี่ยนเป็น URL ของคุณ (เช่น ngrok)
const WEB_URL = "https://your-app-url.ngrok-free.app"; 

// Email Config
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// --- HELPERS ---
const parseThaiDate = (dateStr, timeStr) => {
    return new Date(`${dateStr}T${timeStr}:00+07:00`);
};

// 🔥 FLEX MESSAGE BUILDERS
const flexBuilder = {
    newBooking: (booking, user) => ({
        type: 'flex',
        altText: '📣 มีรายการจองรถใหม่',
        contents: {
            type: 'bubble',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#FF9900',
                contents: [
                    { type: 'text', text: 'NEW REQUEST', color: '#ffffff', weight: 'bold', size: 'xs' },
                    { type: 'text', text: 'คำขอจองรถใหม่', color: '#ffffff', weight: 'bold', size: 'xl', margin: 'sm' }
                ]
            },
            body: {
                type: 'box', layout: 'vertical', spacing: 'md',
                contents: [
                    { type: 'text', text: booking.remarks || '-', weight: 'bold', size: 'lg', wrap: true },
                    { type: 'separator', margin: 'md' },
                    {
                        type: 'box', layout: 'vertical', spacing: 'sm', margin: 'md',
                        contents: [
                            { type: 'box', layout: 'baseline', contents: [{ type: 'text', text: '👤 ผู้จอง', color: '#aaaaaa', size: 'sm', flex: 2 }, { type: 'text', text: `${user.firstName} (${user.department})`, color: '#666666', size: 'sm', flex: 4, wrap: true }] },
                            { type: 'box', layout: 'baseline', contents: [{ type: 'text', text: '📅 เริ่ม', color: '#aaaaaa', size: 'sm', flex: 2 }, { type: 'text', text: `${booking.startDate} ${booking.startTime}`, color: '#666666', size: 'sm', flex: 4 }] },
                            { type: 'box', layout: 'baseline', contents: [{ type: 'text', text: '🏁 สิ้นสุด', color: '#aaaaaa', size: 'sm', flex: 2 }, { type: 'text', text: `${booking.endDate} ${booking.endTime}`, color: '#666666', size: 'sm', flex: 4 }] },
                            { type: 'box', layout: 'baseline', contents: [{ type: 'text', text: '🚗 คนขับ', color: '#aaaaaa', size: 'sm', flex: 2 }, { type: 'text', text: booking.useDriver ? 'ต้องการ' : 'ขับเอง', color: '#333333', size: 'sm', weight: 'bold', flex: 4 }] }
                        ]
                    }
                ]
            },
            footer: {
                type: 'box', layout: 'vertical', spacing: 'sm',
                contents: [
                    { type: 'button', style: 'primary', height: 'sm', action: { type: 'uri', label: 'ตรวจสอบและอนุมัติ', uri: WEB_URL }, color: '#007bff' }
                ]
            }
        }
    }),
    statusUpdate: (booking, status, car, driver) => {
        const isApproved = status === 'approved';
        const color = isApproved ? '#1DB446' : '#FF334B'; 
        const title = isApproved ? 'อนุมัติแล้ว' : 'ไม่ได้รับการอนุมัติ';
        
        let details = [];
        if (isApproved) {
            details = [
                { type: 'box', layout: 'baseline', contents: [{ type: 'text', text: '🚘 รถ', color: '#aaaaaa', size: 'sm', flex: 2 }, { type: 'text', text: car ? `${car.name} (${car.plate})` : '-', color: '#333333', size: 'sm', flex: 4, wrap: true }] },
                { type: 'box', layout: 'baseline', contents: [{ type: 'text', text: '👨‍✈️ คนขับ', color: '#aaaaaa', size: 'sm', flex: 2 }, { type: 'text', text: driver ? `${driver.name} (${driver.phone})` : '-', color: '#333333', size: 'sm', flex: 4, wrap: true }] }
            ];
        } else {
            details = [
                { type: 'text', text: `เหตุผล: ${booking.rejectionReason || '-'}`, color: '#FF334B', size: 'sm', wrap: true }
            ];
        }

        return {
            type: 'flex',
            altText: `ผลการจอง: ${title}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box', layout: 'vertical', backgroundColor: color,
                    contents: [
                        { type: 'text', text: 'BOOKING STATUS', color: '#ffffff', weight: 'bold', size: 'xs' },
                        { type: 'text', text: title, color: '#ffffff', weight: 'bold', size: 'xl', margin: 'sm' }
                    ]
                },
                body: {
                    type: 'box', layout: 'vertical', spacing: 'md',
                    contents: [
                        { type: 'text', text: booking.remarks, weight: 'bold', size: 'lg' },
                        { type: 'text', text: `${booking.startDate} ${booking.startTime}`, size: 'sm', color: '#666666' },
                        { type: 'separator', margin: 'md' },
                        { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'md', contents: details }
                    ]
                },
                footer: {
                    type: 'box', layout: 'vertical',
                    contents: [{ type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: 'ดูรายละเอียด', uri: WEB_URL } }]
                }
            }
        };
    },
    reminder: (booking, title, message) => ({
        type: 'flex',
        altText: title,
        contents: {
            type: 'bubble',
            body: {
                type: 'box', layout: 'vertical',
                contents: [
                    { type: 'text', text: title, weight: 'bold', size: 'xl', color: '#ff334b' },
                    { type: 'text', text: message, margin: 'md', wrap: true, color: '#666666' },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: booking.remarks, margin: 'md', size: 'xs', color: '#aaaaaa' }
                ]
            }
        }
    })
};

const pushLineMessage = async (to, payload) => {
    if (!LINE_ACCESS_TOKEN || !to) return;
    try {
        const messages = typeof payload === 'string' ? [{ type: 'text', text: payload }] : [payload];
        await axios.post('https://api.line.me/v2/bot/message/push', 
            { to: to, messages: messages },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` } }
        );
    } catch (err) { console.error('LINE Push Error:', err.response?.data || err.message); }
};

const sendEmail = async (to, subject, text) => {
    if (!to || !process.env.EMAIL_USER) return;
    try { await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text }); } 
    catch (error) { console.error('Email Error:', error.message); }
};

const checkOverlap = async (newStart, newEnd, carId, driverId, excludeBookingId = null) => {
    const query = { status: { $in: ['approved', 'active', 'maintenance'] }, _id: { $ne: excludeBookingId } };
    const orConditions = [];
    if (carId) orConditions.push({ carId: carId });
    if (driverId) orConditions.push({ driverId: driverId });
    if (orConditions.length > 0) query.$or = orConditions; else return null; 
    
    const existingBookings = await Booking.find(query);
    for (const b of existingBookings) {
        const existingStart = parseThaiDate(b.startDate, b.startTime);
        const existingEnd = parseThaiDate(b.endDate, b.endTime);
        if (newStart < existingEnd && newEnd > existingStart) {
            if (carId && b.carId && b.carId.toString() === carId.toString()) return `รถไม่ว่าง (ติดจองช่วง ${b.startTime}-${b.endTime})`;
            if (driverId && b.driverId && b.driverId.toString() === driverId.toString()) return `คนขับไม่ว่าง (ติดงานช่วง ${b.startTime}-${b.endTime})`;
        }
    }
    return null; 
};

// --- MODELS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, default: '' },
    department: { type: String, default: 'General' },
    role: { type: String, default: 'user' },
    lineUserId: String,
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

const LinkTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }
});
const LinkToken = mongoose.model('LinkToken', LinkTokenSchema);

const SystemConfigSchema = new mongoose.Schema({ key: { type: String, unique: true }, value: String });
const SystemConfig = mongoose.model('SystemConfig', SystemConfigSchema);

const CarSchema = new mongoose.Schema({ name: String, plate: String, status: { type: String, default: 'available' } });
const Car = mongoose.model('Car', CarSchema);

const DriverSchema = new mongoose.Schema({ name: String, phone: String, status: { type: String, default: 'available' } });
const Driver = mongoose.model('Driver', DriverSchema);

const BookingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    startDate: String, startTime: String,
    endDate: String, endTime: String,
    useDriver: Boolean, remarks: String,
    rejectionReason: String,
    cancelledBy: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'maintenance', 'cancelled'], default: 'pending' },
    startOdometer: Number, endOdometer: Number,
    // 🔥 NEW FIELDS: Expense Tracking
    fuelCost: { type: Number, default: 0 },
    tollCost: { type: Number, default: 0 },
    notifiedStart: { type: Boolean, default: false },
    notifiedNearEnd: { type: Boolean, default: false },
    notifiedAdminNoShow: { type: Boolean, default: false }
}, { timestamps: true });
const Booking = mongoose.model('Booking', BookingSchema);

// --- CRON JOBS ---
cron.schedule('* * * * *', async () => {
    const now = new Date();
    const adminConf = await SystemConfig.findOne({ key: 'admin_group_id' });

    const bookingsToStart = await Booking.find({ status: 'approved', notifiedStart: { $ne: true } });
    for (const b of bookingsToStart) {
        const startTime = parseThaiDate(b.startDate, b.startTime);
        if (now >= startTime) {
            const user = await User.findOne({ username: b.userId });
            if (user && user.lineUserId) {
                const flex = flexBuilder.reminder(b, '⏰ ถึงเวลาเดินทาง', 'กรุณากด "เริ่มงาน" ในระบบและกรอกเลขไมล์เพื่อเริ่มบันทึกการใช้งาน');
                await pushLineMessage(user.lineUserId, flex);
            }
            b.notifiedStart = true;
            await b.save();
        }
    }

    const activeBookings = await Booking.find({ status: { $in: ['approved', 'active'] }, notifiedNearEnd: { $ne: true } });
    for (const b of activeBookings) {
        const endTime = parseThaiDate(b.endDate, b.endTime);
        const diffMs = endTime - now;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins <= 30 && diffMins > 0) {
            const user = await User.findOne({ username: b.userId });
            if (user && user.lineUserId) {
                const flex = flexBuilder.reminder(b, '⏳ ใกล้หมดเวลาจอง', `การจองจะสิ้นสุดในอีก ${diffMins} นาที หากต้องการใช้งานต่อ กรุณาตรวจสอบคิวและแจ้งเจ้าหน้าที่`);
                await pushLineMessage(user.lineUserId, flex);
            }
            b.notifiedNearEnd = true;
            await b.save();
        }
    }

    const noShowBookings = await Booking.find({ status: 'approved', notifiedAdminNoShow: { $ne: true } });
    for (const b of noShowBookings) {
        const endTime = parseThaiDate(b.endDate, b.endTime);
        if (now > endTime) {
            if (adminConf) {
                const flex = flexBuilder.reminder(b, '⚠️ No Show Alert', `User: ${b.userId} ไม่ได้กดเริ่มงานตามกำหนดจนเลยเวลาจอง`);
                await pushLineMessage(adminConf.value, flex);
            }
            b.notifiedAdminNoShow = true;
            await b.save();
        }
    }
});

// --- WEBHOOK ---
app.post('/api/webhook', async (req, res) => {
    try {
        const events = req.body.events;
        if (!events || events.length === 0) return res.status(200).send('OK');
        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const text = event.message.text.trim();
                const sourceId = event.source.userId;
                const groupId = event.source.groupId;
                if (text === '!setup admin' && groupId) {
                    await SystemConfig.findOneAndUpdate({ key: 'admin_group_id' }, { value: groupId }, { upsert: true });
                    await pushLineMessage(groupId, '✅ ลงทะเบียนกลุ่ม Admin เรียบร้อย! การแจ้งเตือนงานใหม่จะถูกส่งมาที่นี่');
                } else if (text.startsWith('!link ')) {
                    const token = text.split(' ')[1];
                    const linkData = await LinkToken.findOne({ token }).populate('userId');
                    if (linkData) {
                        const user = linkData.userId;
                        user.lineUserId = sourceId;
                        await user.save();
                        await LinkToken.deleteOne({ _id: linkData._id });
                        await pushLineMessage(sourceId, `✅ เชื่อมต่อสำเร็จ! สวัสดีคุณ ${user.firstName}`);
                    } else {
                        await pushLineMessage(sourceId, `❌ รหัสเชื่อมต่อไม่ถูกต้อง หรือหมดอายุ`);
                    }
                } else if (text === '!myid') {
                    await pushLineMessage(sourceId || groupId, `ID: ${sourceId || groupId}`);
                }
            } else if (event.type === 'follow') {
                const userId = event.source.userId;
                const welcomeMsg = "ยินดีต้อนรับสู่ Corporate Car Booking! 🚗\n\nเพื่อเริ่มรับการแจ้งเตือน กรุณา:\n1. เข้าสู่ระบบที่หน้าเว็บ\n2. กดปุ่ม 'LINE Connect' ที่มุมขวาบน\n3. สแกน QR Code หรือพิมพ์รหัส !link ตามที่ปรากฏครับ";
                await pushLineMessage(userId, welcomeMsg);
            }
        }
        res.status(200).send('OK');
    } catch (err) { res.status(500).send('Error'); }
});

// --- API ROUTES ---
app.get('/api/test', (req, res) => res.send('API Online'));
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'ไม่พบผู้ใช้งาน' });
    if (user.isActive === false) return res.status(403).json({ message: 'บัญชีถูกระงับ' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    res.json(user);
});

app.get('/api/users', async (req, res) => res.json(await User.find({}, '-password')));
app.post('/api/users', async (req, res) => { 
    try { const hashedPassword = await bcrypt.hash(req.body.password, 10); const user = new User({ ...req.body, password: hashedPassword }); await user.save(); res.json(user); } catch (e) { res.status(500).json({error: e.message}); }
});
app.put('/api/users/:id', async (req, res) => {
    try { const updateData = { ...req.body }; if (req.body.password) updateData.password = await bcrypt.hash(req.body.password, 10); if (req.body.resetLine) updateData.lineUserId = null; const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }); res.json(user); } catch (e) { res.status(500).json({error: e.message}); }
});
app.delete('/api/users/:id', async (req, res) => { try { await User.findByIdAndDelete(req.params.id); res.json({success:true}); } catch (e) { res.status(500).json({error: e.message}); } });

app.get('/api/cars', async (req, res) => res.json(await Car.find()));
app.post('/api/cars', async (req, res) => { const car = new Car(req.body); await car.save(); res.json(car); });
app.delete('/api/cars/:id', async (req, res) => { await Car.findByIdAndDelete(req.params.id); res.json({success:true}); });
app.get('/api/drivers', async (req, res) => res.json(await Driver.find()));
app.post('/api/drivers', async (req, res) => { const driver = new Driver(req.body); await driver.save(); res.json(driver); });
app.delete('/api/drivers/:id', async (req, res) => { await Driver.findByIdAndDelete(req.params.id); res.json({success:true}); });

app.get('/api/stats', async (req, res) => { 
    try { 
        const bookings = await Booking.find({ status: { $in: ['approved', 'active', 'completed'] } }).populate('carId').populate('driverId'); 
        const carUsage = {}; bookings.forEach(b => { if (b.carId) carUsage[b.carId.name] = (carUsage[b.carId.name] || 0) + 1; }); 
        const carData = Object.keys(carUsage).map(key => ({ name: key, count: carUsage[key] })); 
        const driverUsage = {}; bookings.forEach(b => { if (b.driverId) { driverUsage[b.driverId.name] = (driverUsage[b.driverId.name] || 0) + 1; }}); 
        const driverData = Object.keys(driverUsage).map(key => ({ name: key, count: driverUsage[key] })); 
        const deptUsage = {}; for (const b of bookings) { const user = await User.findOne({ username: b.userId }); if (user && user.department) deptUsage[user.department] = (deptUsage[user.department] || 0) + 1; } 
        const deptData = Object.keys(deptUsage).map(key => ({ name: key, count: deptUsage[key] })); 
        res.json({ carStats: carData, deptStats: deptData, driverStats: driverData }); 
    } catch (err) { res.status(500).json({ error: err.message }); } 
});

app.post('/api/check-availability', async (req, res) => {
    try {
        const { startDate, startTime, endDate, endTime } = req.body;
        const newStart = parseThaiDate(startDate, startTime);
        const newEnd = parseThaiDate(endDate, endTime);

        const activeBookings = await Booking.find({ status: { $in: ['approved', 'active', 'maintenance'] } });
        const busyCars = [];
        const busyDrivers = [];

        activeBookings.forEach(b => {
            const bStart = parseThaiDate(b.startDate, b.startTime);
            const bEnd = parseThaiDate(b.endDate, b.endTime);
            if (newStart < bEnd && newEnd > bStart) {
                if (b.carId) busyCars.push(b.carId.toString());
                if (b.driverId) busyDrivers.push(b.driverId.toString());
            }
        });

        const allCars = await Car.find();
        const allDrivers = await Driver.find();
        const availableCars = allCars.filter(c => !busyCars.includes(c._id.toString()));
        const availableDrivers = allDrivers.filter(d => !busyDrivers.includes(d._id.toString()));

        res.json({ availableCars, availableDrivers });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const start = parseThaiDate(req.body.startDate, req.body.startTime);
        const end = parseThaiDate(req.body.endDate, req.body.endTime);
        const now = new Date();
        const bufferTime = new Date(now.getTime() - 5 * 60000); 

        if (start < bufferTime && req.body.status !== 'maintenance') return res.status(400).json({ message: "❌ ห้ามจองย้อนหลัง" });
        if (start >= end) return res.status(400).json({ message: "❌ เวลาคืนรถต้องหลังเวลารับรถ" });
        
        if (req.body.status === 'maintenance') { 
            const conflict = await checkOverlap(start, end, req.body.carId, req.body.driverId); 
            if (conflict) return res.status(400).json({ message: conflict }); 
        }
        
        const newBooking = new Booking(req.body); await newBooking.save();
        
        if (newBooking.status === 'pending') {
            const user = await User.findOne({ username: req.body.userId });
            const conf = await SystemConfig.findOne({ key: 'admin_group_id' });
            if (conf && user) {
                const flexMsg = flexBuilder.newBooking(newBooking, user);
                pushLineMessage(conf.value, flexMsg);
            }
            if (user && user.email) sendEmail(user.email, 'Received', 'Received');
        }
        res.json({ success: true, booking: newBooking });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bookings/:id/extend', async (req, res) => {
    try {
        const { newEndDate, newEndTime } = req.body;
        const currentBooking = await Booking.findById(req.params.id);
        if (!currentBooking) return res.status(404).json({ message: 'Booking not found' });

        const oldEnd = parseThaiDate(currentBooking.endDate, currentBooking.endTime);
        const newEnd = parseThaiDate(newEndDate, newEndTime);

        if (newEnd <= oldEnd) return res.status(400).json({ message: 'เวลาใหม่ต้องมากกว่าเวลาเดิม' });

        const conflict = await checkOverlap(oldEnd, newEnd, currentBooking.carId, currentBooking.driverId, currentBooking._id);
        if (conflict) return res.status(400).json({ message: `❌ ไม่สามารถต่อเวลาได้: ${conflict}` });

        currentBooking.endDate = newEndDate;
        currentBooking.endTime = newEndTime;
        currentBooking.notifiedNearEnd = false; 
        currentBooking.notifiedAdminNoShow = false;
        
        await currentBooking.save();

        const conf = await SystemConfig.findOne({ key: 'admin_group_id' });
        if (conf) {
            pushLineMessage(conf.value, `⏳ มีการขอต่อเวลา: ${currentBooking.userId}\nขยายเวลาถึง: ${newEndDate} ${newEndTime}`);
        }

        res.json({ success: true, message: 'ต่อเวลาสำเร็จ' });

    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/bookings', async (req, res) => { res.json(await Booking.find().populate('carId').populate('driverId').sort({ createdAt: -1 })); });
app.put('/api/bookings/:id', async (req, res) => {
    try {
        const { status, carId, driverId } = req.body;
        
        if (status === 'approved') {
            const currentBooking = await Booking.findById(req.params.id);
            if(currentBooking) {
                const start = parseThaiDate(currentBooking.startDate, currentBooking.startTime);
                const end = parseThaiDate(currentBooking.endDate, currentBooking.endTime);
                const conflict = await checkOverlap(start, end, carId, driverId, currentBooking._id);
                if(conflict) return res.status(400).json({ message: `❌ ไม่สามารถอนุมัติได้: ${conflict}` });
            }
        }

        const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('carId').populate('driverId');
        
        if (['approved', 'rejected', 'cancelled'].includes(req.body.status)) {
            const u = await User.findOne({ username: updated.userId });
            if (u && u.lineUserId) {
                const flexMsg = flexBuilder.statusUpdate(updated, req.body.status, updated.carId, updated.driverId);
                pushLineMessage(u.lineUserId, flexMsg);
            }
            if (u && u.email) sendEmail(u.email, `Status: ${req.body.status}`, 'Updated');
        }
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/bookings/:id', async (req, res) => { await Booking.findByIdAndDelete(req.params.id); res.json({success:true}); });
app.post('/api/generate-link-token', async (req, res) => { try { const { userId } = req.body; const token = crypto.randomInt(100000, 999999).toString(); await LinkToken.deleteMany({ userId }); await LinkToken.create({ token, userId }); res.json({ token }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/change-password', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'รหัสผ่านเดิมไม่ถูกต้อง' });
        user.password = await bcrypt.hash(newPassword, 10);
        user.mustChangePassword = false; await user.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/seed', async (req, res) => {
    if (await User.countDocuments() === 0) {
        const hashedPwd = await bcrypt.hash('123', 10);
        await User.create([
            { username: 'admin', password: hashedPwd, firstName:'Admin', department:'IT', role: 'admin', isActive: true },
            { username: 'user', password: hashedPwd, firstName:'Demo', department:'Sales', role: 'user', isActive: true }
        ]);
    }
    res.send('✅ Seed Data Created');
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));