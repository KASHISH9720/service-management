import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose, { connectDB } from './db.js';
import { User } from './models/User.js';
import { Helper } from './models/Helper.js';
import { Booking } from './models/Booking.js';
import { Review } from './models/Review.js';
import { Contact } from './models/Contact.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || 'helper4u-development-secret';

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ---------- helpers ----------
const cleanUser = (u) => {
  const obj = typeof u.toObject === 'function' ? u.toObject() : u;
  const { passwordHash, ...rest } = obj;
  return rest;
};
const makeToken = (u) => jwt.sign({ id: u._id, role: u.role }, JWT_SECRET, { expiresIn: '7d' });

const auth = (req, res, next) => {
  try {
    const raw = req.headers.authorization || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
    if (!token) throw new Error('Missing token');
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Authentication required' });
  }
};
const role = (...roles) => (req, res, next) => roles.includes(req.user?.role)
  ? next()
  : res.status(403).json({ message: 'Access denied' });

// ---------- health ----------
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState; // 1 = connected
  res.json({
    ok: state === 1,
    database: state === 1 ? 'MongoDB connected' : 'MongoDB not connected'
  });
});

// ---------- auth ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

app.post('/api/auth/register', async (req, res) => {
  let createdUser = null;
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim().replace(/\s+/g, ' ');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const accountRole = String(body.role || 'household');
    const phone = String(body.phone || '').trim();
    const city = String(body.city || '').trim();

    // ---- validation (same rules the client enforces) ----
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (name.length < 3) {
      return res.status(400).json({ message: 'Name must be at least 3 characters' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be 10 digits' });
    }
    if (!['household', 'helper'].includes(accountRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    createdUser = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: accountRole,
      phone,
      city
    });

    if (accountRole === 'helper') {
      await Helper.create({
        userId: createdUser._id,
        name: createdUser.name,
        initials: name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase(),
        serviceType: 'maid',
        experience: 'New',
        city,
        rating: 0,
        reviewCount: 0,
        verificationStatus: 'pending',
        availability: 'Flexible',
        skills: [],
        pricing: { hourly: 0, monthly: 0, yearly: 0 },
        bio: ''
      });
    }

    console.log(`New ${accountRole} account saved to MongoDB: ${email}`);
    return res.status(201).json({
      token: makeToken(createdUser),
      user: cleanUser(createdUser),
      message: 'Account created successfully'
    });
  } catch (e) {
    // Roll back the half-created account so MongoDB never holds a broken record.
    if (createdUser) {
      await User.deleteOne({ _id: createdUser._id }).catch(() => {});
      await Helper.deleteOne({ userId: createdUser._id }).catch(() => {});
    }
    if (e && e.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    if (e && e.name === 'ValidationError') {
      const first = Object.values(e.errors || {})[0];
      return res.status(400).json({ message: first?.message || 'Invalid registration details' });
    }
    console.error('Registration failed:', e.message);
    return res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const u = await User.findOne({ email });
    // Same message for both cases so nobody can probe which emails exist.
    if (!u || !u.passwordHash || !(await bcrypt.compare(password, u.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({
      token: makeToken(u),
      user: cleanUser(u),
      message: 'You are logged in successfully'
    });
  } catch (e) {
    console.error('Login failed:', e.message);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// Lets the frontend confirm a stored token is still valid.
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ message: 'Account not found' });
    res.json({ user: cleanUser(u) });
  } catch {
    res.status(500).json({ message: 'Unable to load account' });
  }
});

// ---------- helpers listing ----------
app.get('/api/helpers', async (req, res) => {
  try {
    let list = await Helper.find({ verificationStatus: 'verified' }).lean();
    if (req.query.type) list = list.filter((h) => h.serviceType === req.query.type);
    if (req.query.city) {
      const c = String(req.query.city).toLowerCase();
      list = list.filter((h) => (h.city || '').toLowerCase().includes(c));
    }
    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();
      list = list.filter((h) =>
        (h.name || '').toLowerCase().includes(q) ||
        (h.skills || []).some((s) => s.toLowerCase().includes(q)) ||
        (h.bio || '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => (b.rating - a.rating) || (new Date(b.createdAt) - new Date(a.createdAt)));
    res.json({ helpers: list });
  } catch (e) {
    res.status(500).json({ message: 'Unable to load helpers', helpers: [] });
  }
});

app.get('/api/helpers/:id', async (req, res) => {
  try {
    const helper = await Helper.findById(req.params.id).lean();
    if (!helper) return res.status(404).json({ message: 'Helper not found' });
    const reviews = await Review.find({ helperId: helper._id }).sort({ createdAt: -1 }).lean();
    res.json({ helper, reviews });
  } catch (e) {
    res.status(500).json({ message: 'Unable to load helper profile' });
  }
});

// ---------- bookings ----------
app.post('/api/bookings', auth, role('household'), async (req, res) => {
  try {
    const { helperId, plan, startDate = '', notes = '' } = req.body || {};
    if (!helperId) return res.status(400).json({ message: 'Invalid helper id' });
    if (!['hourly', 'monthly', 'yearly'].includes(plan)) return res.status(400).json({ message: 'Invalid plan' });
    const helper = await Helper.findById(helperId);
    if (!helper || helper.verificationStatus !== 'verified') return res.status(404).json({ message: 'Verified helper not found' });
    const household = await User.findById(req.user.id);
    if (!household) return res.status(404).json({ message: 'Household account not found' });
    const booking = await Booking.create({
      householdId: household._id,
      householdName: household.name,
      helperId: helper._id,
      helperName: helper.name,
      plan,
      startDate,
      amount: helper.pricing?.[plan] || 0,
      status: 'pending',
      notes
    });
    res.status(201).json({ booking, message: 'Booking request created successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Booking failed' });
  }
});

app.get('/api/bookings', auth, async (req, res) => {
  try {
    let list;
    if (req.user.role === 'household') {
      list = await Booking.find({ householdId: req.user.id }).lean();
    } else if (req.user.role === 'helper') {
      const helper = await Helper.findOne({ userId: req.user.id }).lean();
      list = helper ? await Booking.find({ helperId: helper._id }).lean() : [];
    } else {
      list = await Booking.find({}).lean();
    }
    list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ bookings: list });
  } catch (e) {
    res.status(500).json({ message: 'Unable to load bookings', bookings: [] });
  }
});

app.patch('/api/bookings/:id/status', auth, role('helper', 'admin'), async (req, res) => {
  try {
    const allowed = ['accepted', 'rejected', 'completed'];
    if (!allowed.includes(req.body?.status)) return res.status(400).json({ message: 'Invalid booking status' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (req.user.role === 'helper') {
      const helper = await Helper.findOne({ userId: req.user.id }).lean();
      if (!helper || booking.helperId !== helper._id) return res.status(403).json({ message: 'You can only update your own bookings' });
    }
    booking.status = req.body.status;
    await booking.save();
    res.json({ booking });
  } catch (e) {
    res.status(500).json({ message: 'Unable to update booking status' });
  }
});

// ---------- reviews ----------
app.post('/api/reviews', auth, role('household'), async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.body?.bookingId, householdId: req.user.id, status: 'completed' }).lean();
    if (!booking) return res.status(400).json({ message: 'Only completed bookings can be reviewed' });
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    const review = await Review.create({
      helperId: booking.helperId,
      householdId: req.user.id,
      rating,
      comment: String(req.body?.comment || '')
    });
    const forHelper = await Review.find({ helperId: booking.helperId }).lean();
    const avg = forHelper.reduce((sum, r) => sum + r.rating, 0) / forHelper.length;
    await Helper.findByIdAndUpdate(booking.helperId, { rating: Number(avg.toFixed(1)), reviewCount: forHelper.length });
    res.status(201).json({ review });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Review failed' });
  }
});

// ---------- contact ----------
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) return res.status(400).json({ message: 'All contact fields are required' });
    await Contact.create({ name, email, subject, message });
    res.status(201).json({ message: 'Your message has been recorded successfully' });
  } catch (e) {
    res.status(500).json({ message: 'Unable to save message' });
  }
});

// ---------- admin ----------
app.get('/api/admin/dashboard', auth, role('admin'), async (req, res) => {
  try {
    const households = await User.countDocuments({ role: 'household' });
    const verifiedHelpers = await Helper.countDocuments({ verificationStatus: 'verified' });
    const bookings = await Booking.countDocuments({});
    const completed = await Booking.countDocuments({ status: 'completed' });
    const pending = await Helper.find({ verificationStatus: 'pending' }).lean();
    res.json({
      kpis: { households, verifiedHelpers, bookings, completionRate: bookings ? Math.round((completed / bookings) * 100) : 0 },
      pending
    });
  } catch (e) {
    res.status(500).json({ message: 'Unable to load dashboard' });
  }
});

app.patch('/api/admin/helpers/:id/verify', auth, role('admin'), async (req, res) => {
  try {
    if (!['verified', 'rejected', 'pending'].includes(req.body?.status)) return res.status(400).json({ message: 'Invalid verification status' });
    const helper = await Helper.findByIdAndUpdate(req.params.id, { verificationStatus: req.body.status }, { new: true });
    if (!helper) return res.status(404).json({ message: 'Helper not found' });
    res.json({ helper });
  } catch (e) {
    res.status(500).json({ message: 'Unable to update verification status' });
  }
});

// ---------- demo seed data ----------
async function seedDemoData() {
  const adminEmail = 'admin@helper4u.com';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: 'System Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash('Admin@123', 10),
      role: 'admin',
      phone: '',
      city: ''
    });
    console.log('Seeded demo admin account: admin@helper4u.com / Admin@123');
  }

  const demoHelpers = [
    ['Priya Sharma', 'PS', 'maid', '5+ years', 'Delhi', 4.8, ['Cleaning', 'Cooking', 'Laundry'], 160, 14500, 165000, 'Experienced household professional for daily home support.'],
    ['Anita Verma', 'AV', 'maid', '3-5 years', 'Meerut', 4.7, ['Cleaning', 'Cooking', 'Elder Care'], 150, 13500, 155000, 'Reliable maid with flexible morning and full-day availability.'],
    ['Neha Singh', 'NS', 'babysitter', '3-5 years', 'Noida', 4.9, ['Baby Care', 'Feeding', 'First Aid'], 180, 16000, 180000, 'Caring babysitter experienced with infants and toddlers.'],
    ['Kavita Rao', 'KR', 'nanny', '5+ years', 'Gurugram', 4.8, ['Child Care', 'Meals', 'Homework'], 190, 17500, 195000, 'Professional nanny focused on safe routines and child development.']
  ];

  for (const [name, initials, serviceType, experience, city, rating, skills, hourly, monthly, yearly, bio] of demoHelpers) {
    const existingHelper = await Helper.findOne({ name });
    if (!existingHelper) {
      await Helper.create({
        userId: null,
        name,
        initials,
        serviceType,
        experience,
        city,
        rating,
        reviewCount: Math.floor(rating * 20),
        verificationStatus: 'verified',
        availability: 'Flexible',
        skills,
        pricing: { hourly, monthly, yearly },
        bio
      });
    }
  }
  console.log('Demo verified helpers are ready.');
}

async function start() {
  await connectDB();
  // Makes the unique-email rule real at the database level, not just in code.
  await User.syncIndexes().catch((e) => console.warn('Index sync skipped:', e.message));
  await seedDemoData();
  app.listen(PORT, () => console.log(`Helper4U API running at http://localhost:${PORT} (connected to MongoDB)`));
}

start();
