const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const { normalizeLanguage } = require('../services/languageService');

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
});

const signToken = (user) => jwt.sign(
  { sub: user.id, role: user.role, rep_id: user.rep_id || null },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);

// ─── Register with email/password ────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, preferred_language } = req.body;
    if (!name || (!email && !phone))
      return res.status(400).json({ error: 'Name and email or phone required' });

    const hash = await bcrypt.hash(password || uuidv4(), 10);

    const { data: existing } = await supabase.from('users')
      .select('id').or(`email.eq.${email},phone.eq.${phone}`).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Account already exists' });

    const { data: user, error } = await supabase.from('users').insert({
      id: uuidv4(), name, email, phone,
      password_hash: hash,
      role: 'CITIZEN',
      preferred_language: normalizeLanguage(preferred_language),
      is_active: true
    }).select().single();

    if (error) throw error;

    res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Login with email/password ───────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password, preferred_language } = req.body;
    if (!email && !phone)
      return res.status(400).json({ error: 'Email or phone required' });

    const query = supabase.from('users').select('*');
    if (email) query.eq('email', email);
    else query.eq('phone', phone);

    const { data: user, error } = await query.single();
    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash || '');
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account suspended' });

    const loginUpdates = { last_active_at: new Date() };
    if (preferred_language) loginUpdates.preferred_language = normalizeLanguage(preferred_language);
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(loginUpdates)
      .eq('id', user.id)
      .select('*')
      .single();
    if (updateError) throw updateError;

    res.json({ token: signToken(updatedUser), user: sanitizeUser(updatedUser) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Social login (Google / Facebook) ────────────────────────
router.post('/social', async (req, res) => {
  try {
    const { provider, uid, name, email, avatar_url, preferred_language } = req.body;
    if (!provider || !uid || !name)
      return res.status(400).json({ error: 'provider, uid, name required' });

    let { data: user } = await supabase.from('users')
      .select('*').eq('social_uid', uid).maybeSingle();

    if (!user) {
      const { data: newUser, error } = await supabase.from('users').insert({
        id: uuidv4(), name, email,
        social_provider: provider, social_uid: uid,
        avatar_url, role: 'CITIZEN', preferred_language: normalizeLanguage(preferred_language), is_active: true
      }).select().single();
      if (error) throw error;
      user = newUser;
    }

    const updates = { last_active_at: new Date() };
    if (preferred_language) updates.preferred_language = normalizeLanguage(preferred_language);
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single();
    if (updateError) throw updateError;
    res.json({ token: signToken(updatedUser), user: sanitizeUser(updatedUser) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get current user ─────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users')
      .select('*, wards(id, name, ward_number, city, state_name, zone_id)')
      .eq('id', req.user.id).single();
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Update current user profile/home ward ───────────────────
router.put('/me', authenticate, async (req, res) => {
  try {
    const updates = {};
    const { name, phone, avatar_url, home_ward_id, preferred_language } = req.body;

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url ? String(avatar_url).trim() : null;
    if (preferred_language !== undefined) updates.preferred_language = normalizeLanguage(preferred_language);
    if (home_ward_id !== undefined) {
      if (home_ward_id) {
        const { data: ward } = await supabase.from('wards').select('id').eq('id', home_ward_id).maybeSingle();
        if (!ward) return res.status(400).json({ error: 'Invalid home_ward_id' });
      }
      updates.home_ward_id = home_ward_id || null;
    }

    if (updates.name === '') return res.status(400).json({ error: 'Name cannot be empty' });

    const { data: user, error } = await supabase.from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('*, wards(id, name, ward_number, city, state_name, zone_id)')
      .single();

    if (error) throw error;
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Upload current user avatar to Supabase Storage ──────────
router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Avatar image required' });
    if (!req.file.mimetype?.startsWith('image/')) {
      return res.status(400).json({ error: 'Avatar must be an image' });
    }

    const bucket = 'avatars';
    const ext = (req.file.originalname?.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const path = `users/${req.user.id}/${uuidv4()}.${ext}`;

    const { error: bucketError } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 3 * 1024 * 1024,
    });
    if (bucketError && !/already exists/i.test(bucketError.message || '')) throw bucketError;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    const avatar_url = publicData.publicUrl;

    const { data: user, error } = await supabase.from('users')
      .update({ avatar_url })
      .eq('id', req.user.id)
      .select('*, wards(id, name, ward_number, city, state_name, zone_id)')
      .single();
    if (error) throw error;

    res.json({ avatar_url, user: sanitizeUser(user) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Avatar upload failed' });
  }
});

// ─── Update FCM token ─────────────────────────────────────────
router.put('/fcm-token', authenticate, async (req, res) => {
  const { fcm_token } = req.body;
  await supabase.from('users').update({ fcm_token }).eq('id', req.user.id);
  res.json({ ok: true });
});

const sanitizeUser = (u) => ({
  id: u.id, name: u.name, email: u.email, phone: u.phone,
  role: u.role, avatar_url: u.avatar_url, home_ward_id: u.home_ward_id,
  preferred_language: normalizeLanguage(u.preferred_language),
  home_ward: u.wards || null
});

module.exports = router;
