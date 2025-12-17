const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const db = require('./db');   // ✅ use pool instead of single connection
const bcrypt = require('bcrypt');
const crypto = require('crypto');

function generateToken(length = 8) {
  return crypto.randomBytes(length).toString('hex');
}

app.use(express.static(path.join(__dirname, 'fuel')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSION CONFIGURATION
app.use(session({
  secret: 'romeo2010favourrhian',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 }
}));

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).send('Unauthorized: Please log in first');
  }
}

// Load AI knowledge
const knowledgePath = path.join(__dirname, 'knowledge.json');
let knowledge = [];
try {
  const data = fs.readFileSync(knowledgePath, 'utf-8');
  knowledge = JSON.parse(data);
  console.log(`Loaded ${knowledge.length} knowledge entries`);
} catch (err) {
  console.error('Failed to load knowledge.json', err);
}

// Fuel endpoints
app.get('/fuel', (req, res) => {
  db.query('SELECT * FROM fuel_pumps', (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch fuel pumps' });
    res.json(results);
  });
});

app.get('/emergency-fuel', (req, res) => {
  const { lat, lng } = req.query;
  const sql = `
    SELECT *,
    (
      6371 * acos(
        cos(radians(?)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(latitude))
      )
    ) AS distance
    FROM fuel_pumps
    WHERE status = 'Available'
    ORDER BY distance ASC, FIELD(queue_level,'short','medium','long')
    LIMIT 3
  `;
  db.query(sql, [lat, lng, lat], (err, results) => {
    if (err) return res.status(500).json({ error: 'Emergency lookup failed' });
    res.json(results);
  });
});

app.get('/other-businesses', (req, res) => {
  const sql = `
    SELECT id, name, category, city, latitude, longitude, rating, opening_hours AS opening,
           image, status
    FROM other_businesses
    WHERE status = 'Open'
    ORDER BY rating DESC
    LIMIT 20
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to load businesses' });
    res.json(results);
  });
});

//About AI
app.post('/about-ai', (req, res) => {
  const q = (req.body.question || '').toLowerCase().trim();
  let reply = "I specialize in SmartLink Malawi. Please ask me something about the platform. 😊";

  let bestMatch = null;
  let highestScore = 0;

  for (const item of knowledge) {
    let score = 0;

    for (const keyword of item.keywords) {
      if (q === keyword.toLowerCase()) {
        score += 3; // exact intent
      } else if (q.includes(keyword.toLowerCase())) {
        score += 1; // partial intent
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && bestMatch.answers.length) {
    const i = Math.floor(Math.random() * bestMatch.answers.length);
    reply = bestMatch.answers[i];
  }

  res.json({ reply });
});


// SIGNUP
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already in use' });
          return res.status(500).json({ error: 'Server error' });
        }
        req.session.userId = result.insertId;
        res.json({ success: true, message: 'Account created', userId: result.insertId });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    db.query(
      'SELECT * FROM users WHERE email = ?',
      [email],
      async (err, rows) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (!rows.length) return res.status(400).json({ error: 'Invalid email or password' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid email or password' });

        req.session.userId = user.id;
        res.json({ success: true, message: 'Logged in', userId: user.id });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGOUT
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Failed to logout' });
    res.json({ success: true, message: 'Logged out' });
  });
});

// DASHBOARD
app.get('/dashboard', isLoggedIn, (req, res) => {
  db.query(
    'SELECT id, name, email FROM users WHERE id = ?',
    [req.session.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json({ user: rows[0] });
    }
  );
});

// Middleware for SPA
app.use((req, res, next) => {
  const openPaths = ['/login', '/signup', '/about-ai', '/fuel', '/emergency-fuel', '/other-businesses'];
  if (openPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  if (!req.session.userId) {
    return res.sendFile(path.join(__dirname, 'fuel', 'login.html'));
  }
  next();
});

app.use(express.static(path.join(__dirname, 'fuel')));

// Session check
app.get('/me', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, userId: req.session.userId });
  } else {
    res.json({ loggedIn: false });
  }
});

// RESERVATIONS (fuel_time auto default)
app.post('/reservations', async (req, res) => {
  const {
    business_id,
    type,
    fuel_type,
    fuel_amount,
    service_name,
    service_time
  } = req.body;

  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (!business_id || !type) return res.status(400).json({ error: 'Business ID and type are required' });

  if (type === 'fuel' && (!fuel_type || !fuel_amount)) {
    return res.status(400).json({ error: 'Fuel type and amount are required for fuel reservations' });
  }
  if (type === 'other' && (!service_name || !service_time)) {
    return res.status(400).json({ error: 'Service name and time are required for other reservations' });
  }

  try {
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();

    const sql = `
      INSERT INTO reservations
        (user_id, business_id, type, fuel_type, fuel_amount, service_name, service_time, token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.promise.execute(sql, [
      req.session.userId,
      business_id,
      type,
      type === 'fuel' ? fuel_type : null,
      type === 'fuel' ? fuel_amount : null,
      type === 'other' ? service_name : null,
      type === 'other' ? service_time : null,
      token
    ]);

    res.json({ success: true, reservationId: result.insertId, token });
  } catch (err) {
    console.error('Insert Reservation Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// MY RESERVATIONS
app.get('/my-reservations', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const sql = `
      SELECT 
        r.*,
        CASE 
            WHEN r.type = 'other' THEN ob.name
            WHEN r.type = 'fuel' THEN fp.name
            ELSE NULL
        END AS business_name
      FROM reservations r
      LEFT JOIN other_businesses ob 
          ON r.business_id = ob.id AND r.type COLLATE utf8mb4_unicode_ci = 'other'
      LEFT JOIN fuel_pumps fp
          ON r.business_id = fp.id AND r.type COLLATE utf8mb4_unicode_ci = 'fuel'
      WHERE r.user_id = ?
      ORDER BY COALESCE(r.fuel_time, r.service_time, r.created_at) DESC;
    `;

    const [rows] = await db.promise.execute(sql, [req.session.userId]);
    res.json({ reservations: rows });
  } catch (err) {
    console.error('My Reservations Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// NOTIFICATIONS
app.get('/notifications', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const sql = `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`;
    const [rows] = await db.promise.execute(sql, [req.session.userId]);
    res.json({ notifications: rows });
  } catch (err) {
    console.error('Notifications Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fallback route for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'fuel', 'index.html'));
});

// START SERVER
app.listen(3011, '0.0.0.0', () => {
  console.log('Server running on port 3011');
});
