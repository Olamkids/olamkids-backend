const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { getDb, seedIfEmpty } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Sessions ───
const sessions = new Map(); // token -> { username, role }

// ─── Middleware ───
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve the dashboard
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── Auth endpoints ───
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, role: user.role });
  res.json({ token, username, role: user.role });
});

app.post('/api/logout', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (token) sessions.delete(token);
  res.json({ status: 'ok' });
});

// ─── Auth middleware for all /api/* routes (except login) ───
app.use('/api', (req, res, next) => {
  if (req.path === '/login') return next();
  const token = req.headers['x-auth-token'];
  const session = token && sessions.get(token);
  if (!session) return res.status(401).json({ error: 'Non authentifié' });
  req.user = session;
  next();
});

// ─── Role check helper ───
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé à l\'administrateur' });
  next();
}

// ============================================================
// PRODUCTS
// ============================================================

app.get('/api/products', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM products ORDER BY sku').all());
});

app.get('/api/products/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Product not found' });
  res.json(row);
});

app.post('/api/products', adminOnly, (req, res) => {
  const db = getDb();
  const { id, name, sku, category, size, price, stock, costPrice, avgCost } = req.body;
  const pid = id || 'o_' + Math.random().toString(36).substr(2, 9);

  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(pid);
  if (existing) return res.status(409).json({ error: 'Product with this ID already exists' });

  db.prepare(`
    INSERT INTO products (id, name, sku, category, size, price, stock, costPrice, avgCost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(pid, name, sku || '', category || '', size || '', price || 0, stock || 0, costPrice || 0, avgCost || 0);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(pid);
  res.status(201).json(product);
});

app.put('/api/products/:id', adminOnly, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const fields = ['name', 'sku', 'category', 'size', 'price', 'stock', 'costPrice', 'avgCost'];
  const updates = [];
  const values = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }

  if (updates.length === 0) return res.json(existing);

  updates.push("updated_at = datetime('now')");
  values.push(req.params.id);

  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

// POST restock product (weighted average cost)
app.post('/api/products/:id/restock', adminOnly, (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { qty, costPrice } = req.body;
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Invalid quantity' });
  if (!costPrice || costPrice <= 0) return res.status(400).json({ error: 'Invalid cost price' });

  const oldStock = product.stock || 0;
  const oldAvg = product.avgCost || 0;
  const newStock = oldStock + qty;
  const newAvg = oldStock === 0 ? costPrice : Math.round(((oldAvg * oldStock) + (costPrice * qty)) / newStock);

  db.prepare(`
    UPDATE products SET stock = ?, costPrice = ?, avgCost = ?, updated_at = datetime('now') WHERE id = ?
  `).run(newStock, costPrice, newAvg, req.params.id);

  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

// POST deduct stock (from sale)
app.post('/api/products/:id/deduct', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { qty } = req.body;
  const newStock = Math.max(0, (product.stock || 0) - (qty || 1));

  db.prepare(`UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?`).run(newStock, req.params.id);
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

app.delete('/api/products/:id', adminOnly, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ============================================================
// SALES
// ============================================================

app.get('/api/sales', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM sales ORDER BY created_at DESC').all());
});

app.post('/api/sales', (req, res) => {
  const db = getDb();
  const { id, productName, quantity, unitPrice, total, date, payment, productId } = req.body;
  const sid = id || 'o_' + Math.random().toString(36).substr(2, 9);

  db.prepare(`
    INSERT INTO sales (id, productName, quantity, unitPrice, total, date, payment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(sid, productName, quantity || 1, unitPrice || 0, total || 0, date, payment || 'Espèces');

  // Deduct stock if productId provided
  if (productId) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (product && product.stock > 0) {
      const newStock = Math.max(0, product.stock - (quantity || 1));
      db.prepare('UPDATE products SET stock = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newStock, productId);
    }
  }

  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(sid);
  res.status(201).json(sale);
});

app.delete('/api/sales/:id', adminOnly, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM sales WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Sale not found' });

  db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ============================================================
// EXPENSES
// ============================================================

app.get('/api/expenses', adminOnly, (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all());
});

app.post('/api/expenses', adminOnly, (req, res) => {
  const db = getDb();
  const { id, description, category, amount, date, notes } = req.body;
  const eid = id || 'o_' + Math.random().toString(36).substr(2, 9);

  db.prepare(`
    INSERT INTO expenses (id, description, category, amount, date, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(eid, description, category || '', amount || 0, date, notes || '');

  res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(eid));
});

app.put('/api/expenses/:id', adminOnly, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  const { description, category, amount, date, notes } = req.body;
  db.prepare(`
    UPDATE expenses SET description = ?, category = ?, amount = ?, date = ?, notes = ? WHERE id = ?
  `).run(description || existing.description, category || existing.category,
    amount !== undefined ? amount : existing.amount, date || existing.date,
    notes !== undefined ? notes : existing.notes, req.params.id);

  res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id));
});

app.delete('/api/expenses/:id', adminOnly, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ============================================================
// EXPORT / IMPORT
// ============================================================

app.get('/api/export', adminOnly, (req, res) => {
  const db = getDb();
  res.json({
    exported_at: new Date().toISOString(),
    products: db.prepare('SELECT * FROM products ORDER BY sku').all(),
    sales: db.prepare('SELECT * FROM sales ORDER BY created_at DESC').all(),
    expenses: db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all(),
  });
});

app.post('/api/import', adminOnly, (req, res) => {
  const db = getDb();
  const { products, sales, expenses } = req.body;

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM sales').run();
    db.prepare('DELETE FROM expenses').run();
    db.prepare('DELETE FROM products').run();

    if (products && products.length) {
      const stmt = db.prepare('INSERT INTO products (id, name, sku, category, size, price, stock, costPrice, avgCost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const p of products) {
        stmt.run(p.id, p.name, p.sku || '', p.category || '', p.size || '', p.price || 0, p.stock || 0, p.costPrice || 0, p.avgCost || 0);
      }
    }
    if (sales && sales.length) {
      const stmt = db.prepare('INSERT INTO sales (id, productName, quantity, unitPrice, total, date, payment) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const s of sales) {
        stmt.run(s.id, s.productName, s.quantity || 1, s.unitPrice || 0, s.total || 0, s.date, s.payment || '');
      }
    }
    if (expenses && expenses.length) {
      const stmt = db.prepare('INSERT INTO expenses (id, description, category, amount, date, notes) VALUES (?, ?, ?, ?, ?, ?)');
      for (const e of expenses) {
        stmt.run(e.id, e.description, e.category || '', e.amount || 0, e.date, e.notes || '');
      }
    }
  });

  tx();
  res.json({ status: 'ok', message: 'Data imported successfully' });
});

// ============================================================
// USERS (admin only)
// ============================================================

app.get('/api/users', adminOnly, (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT username, role, created_at FROM users ORDER BY created_at').all());
});

app.post('/api/users', adminOnly, (req, res) => {
  const db = getDb();
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
  if (username.length < 3) return res.status(400).json({ error: 'Nom d\'utilisateur trop court (min 3 caractères)' });
  if (password.length < 4) return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' });

  const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Ce nom d\'utilisateur existe déjà' });

  const userRole = role === 'admin' ? 'admin' : 'cashier';
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, userRole);
  res.status(201).json({ username, role: userRole });
});

app.put('/api/users/:username', adminOnly, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const { password, role } = req.body;
  if (password && password.length < 4) return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' });

  const newPass = password || existing.password;
  const newRole = role ? (role === 'admin' ? 'admin' : 'cashier') : existing.role;
  db.prepare('UPDATE users SET password = ?, role = ? WHERE username = ?').run(newPass, newRole, req.params.username);

  // Invalidate active sessions for this user if role changed
  if (newRole !== existing.role || password) {
    for (const [token, session] of sessions) {
      if (session.username === req.params.username) sessions.delete(token);
    }
  }

  res.json({ username: req.params.username, role: newRole });
});

app.delete('/api/users/:username', adminOnly, (req, res) => {
  const db = getDb();
  if (req.params.username === req.user.username) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });

  const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(req.params.username);
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' });

  db.prepare('DELETE FROM users WHERE username = ?').run(req.params.username);

  // Invalidate sessions
  for (const [token, session] of sessions) {
    if (session.username === req.params.username) sessions.delete(token);
  }

  res.status(204).send();
});

// ============================================================
// START
// ============================================================
function start() {
  const db = getDb();
  seedIfEmpty();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OLAM Kids] Server running on port ${PORT}`);
    const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
    console.log(`[OLAM Kids] ${count} products in database`);
  });
}

start();
