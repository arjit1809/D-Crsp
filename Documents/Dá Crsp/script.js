const express = require('express');
const cors    = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ────────────────────────────────────────────────────────────
//  SUPABASE CONNECTION
// ────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://wkgpfdszpfavgngbeupu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_J7hJe8PCAjLymkBfNKuBIw_6UbQ_I8-';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ────────────────────────────────────────────────────────────
//  LOGIC HELPERS
// ────────────────────────────────────────────────────────────
const themeConfig = {
  stressed: { name: 'Exam Stressed', primary: '#FF4757', secondary: '#FF6B81', accent: '#FFA502', background: '#1a0a0a', cardBg: '#2a1010', gradient: 'linear-gradient(135deg, #FF4757, #FF6B81)', emoji: '😤' },
  hungry: { name: 'Starving', primary: '#FF8C42', secondary: '#FFB347', accent: '#4CAF50', background: '#1a1205', cardBg: '#2a1d0a', gradient: 'linear-gradient(135deg, #FF8C42, #FFB347)', emoji: '🤤' },
  gaming: { name: 'Gaming Mode', primary: '#6C5CE7', secondary: '#A29BFE', accent: '#00CEC9', background: '#0a0a1a', cardBg: '#10102a', gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', emoji: '🎮' },
  late_night: { name: 'Late Night', primary: '#2D3436', secondary: '#636E72', accent: '#00B894', background: '#0a0a0a', cardBg: '#1a1a1a', gradient: 'linear-gradient(135deg, #2D3436, #636E72)', emoji: '🌙' },
  default: { name: 'Dá Crsp Mode', primary: '#FF6B2B', secondary: '#FFD93D', accent: '#4ECDC4', background: '#1A0F00', cardBg: '#1E1505', gradient: 'linear-gradient(135deg, #FF6B2B, #FFD93D)', emoji: '🍜' }
};

function isPeakHour() {
  const h = new Date().getHours();
  return h >= 21 && h < 23;
}

// ────────────────────────────────────────────────────────────
//  API ROUTES
// ────────────────────────────────────────────────────────────

// Get all products from Supabase
app.get('/api/products', async (req, res) => {
  const { category } = req.query;
  let query = supabase.from('products').select('*');
  
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data });
});

// Get categories (Calculated from products in Supabase)
app.get('/api/categories', async (req, res) => {
  const { data, error } = await supabase.from('products').select('category');
  if (error) return res.status(500).json({ success: false, error: error.message });

  const cats = [...new Set(data.map(p => p.category))];
  const response = cats.map(c => ({
    category: c,
    count: data.filter(p => p.category === c).length,
    emoji: { noodles: '🍜', drinks: '⚡', juices: '🧃', chips: '🥔', biscuits: '🍪', protein: '💪' }[c] || '📦'
  }));
  res.json({ success: true, data: response });
});

// Get bundles from Supabase
app.get('/api/bundles', async (req, res) => {
  const { data, error } = await supabase.from('bundles').select('*');
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data });
});

// Place order to Supabase
app.post('/api/orders', async (req, res) => {
  const { userName, phone, wing, room, items, total } = req.body;
  const eta = isPeakHour() ? 40 : 15;

  const { data, error } = await supabase
    .from('orders')
    .insert([{ 
        user_name: userName, 
        phone, wing, room, 
        items, total, 
        status: 'placed',
        eta: eta
    }])
    .select();

  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, message: "Order saved to Supabase!", data: data[0] });
});

// Leaderboard (Real-time calculation from Supabase Orders)
app.get('/api/leaderboard', async (req, res) => {
  const { data, error } = await supabase.from('orders').select('room, wing');
  if (error) return res.json({ success: true, data: [] });

  const counts = data.reduce((acc, curr) => {
    const key = `${curr.wing}-${curr.room}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(counts)
    .map(([key, count]) => ({
      room: key.split('-')[1],
      wing: key.split('-')[0],
      weekOrders: count,
      isFreeUnlocked: count >= 3
    }))
    .sort((a, b) => b.weekOrders - a.weekOrders)
    .slice(0, 10)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  res.json({ success: true, data: sorted });
});

// Get ETA
app.get('/api/eta', (req, res) => {
  const peak = isPeakHour();
  res.json({
    success: true,
    isPeakHour: peak,
    etaMinutes: peak ? 40 : 15,
    warning: peak ? '⚠️ Peak Hours (9–11 PM): Delivery may take 40 mins.' : null
  });
});

// Themes
app.get('/api/themes', (req, res) => res.json({ success: true, data: themeConfig }));

// Serve frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'frontend.html')));

app.listen(PORT, () => {
  console.log(`Dá Crsp running on http://localhost:${PORT}`);
});