const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MongoDB Connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pollutrack';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to PolluTrack MongoDB Database'))
  .catch(err => console.error('MongoDB connection error:', err));

// Pollution Report Schema
const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  severity: { type: String, required: true },
  description: { type: String, default: '' },
  locationName: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  status: { type: String, default: 'Reported' },
  createdAt: { type: Date, default: Date.now },
  imagePath: String,
  distanceKm: { type: Number, default: 0.5 }
});

const Report = mongoose.model('Report', reportSchema);

// Configure Nodemailer Transporter (Official PolluTrack Gmail App Password Configured)
const EMAIL_USER = process.env.EMAIL_USER || 'polluttrack@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ktpr udjb zgax rxqv';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('PolluTrack Gmail SMTP Connection Error:', error);
  } else {
    console.log('PolluTrack Gmail SMTP Transporter is Ready to send OTP Emails!');
  }
});

// GET /api/reports - Fetch all pollution reports
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports - Create new pollution report (Citizen upload)
app.post('/api/reports', async (req, res) => {
  try {
    const newReport = new Report(req.body);
    const saved = await newReport.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/send-otp - PolluTrack Email OTP Service
app.post('/api/send-otp', async (req, res) => {
  const { email, otp } = req.body;
  console.log(`[PolluTrack OTP Service] Generating OTP [${otp}] for email: ${email}`);

  try {
    const mailOptions = {
      from: `"PolluTrack Verification" <${EMAIL_USER}>`,
      to: email,
      subject: `PolluTrack — Verification OTP Code: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #0A1813; color: #ffffff; border-radius: 12px; border: 1px solid #1C3A30;">
          <h2 style="color: #27C196; margin-top: 0;">PolluTrack — Report. Track. Breathe Clean.</h2>
          <p style="color: #9EBAAF; font-size: 14px;">Your 6-Digit Email Verification Code is:</p>
          <div style="font-size: 32px; font-weight: 800; color: #8FE3CC; letter-spacing: 6px; padding: 14px 20px; background: #12251E; display: inline-block; border-radius: 10px; border: 1px solid #27C196;">
            ${otp}
          </div>
          <p style="color: #7E988F; font-size: 12px; margin-top: 24px;">This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[PolluTrack Mailer Success] Real OTP Email sent to ${email}. MessageId: ${info.messageId}`);
    return res.json({
      success: true,
      message: `Verification OTP ${otp} sent to ${email}`,
      email,
      otp
    });
  } catch (err) {
    console.error(`[PolluTrack Mailer Error]: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: err.message,
      email,
      otp
    });
  }
});

// PATCH /api/reports/:id/status - Update report status (Admin Web Portal connect)
app.patch('/api/reports/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`PolluTrack Backend Server running on port ${PORT}`));
