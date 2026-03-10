const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'olamkids.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT DEFAULT '',
      category TEXT DEFAULT '',
      size TEXT DEFAULT '',
      price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      costPrice REAL DEFAULT 0,
      avgCost REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      productName TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unitPrice REAL DEFAULT 0,
      total REAL DEFAULT 0,
      date TEXT NOT NULL,
      payment TEXT DEFAULT 'Espèces',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      category TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (count === 0) {
    console.log('[DB] Seeding default catalogue...');
    seedProducts();
    console.log('[DB] Seed complete.');
  }

  // Always ensure admin account exists
  const adminExists = db.prepare('SELECT username FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    console.log('[DB] Creating default admin account...');
    db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)').run('Fondatrice', 'aziel2016', 'admin');
  }
}

function seedProducts() {
  const catalogue = [
    {id:"r001",name:"Robe Fendi grise",category:"Vêtements",size:"2-3A",price:0,stock:0,sku:"REF-001",costPrice:0,avgCost:0},
    {id:"r002",name:"Sac à main enfant",category:"Sacs",size:"Unique",price:0,stock:0,sku:"REF-002",costPrice:0,avgCost:0},
    {id:"r003",name:"Bonnet de bébé",category:"Accessoires",size:"0-3M",price:0,stock:0,sku:"REF-003",costPrice:0,avgCost:0},
    {id:"r004",name:"Coussin de positionnement bébé",category:"Literie",size:"Unique",price:0,stock:0,sku:"REF-004",costPrice:0,avgCost:0},
    {id:"r005",name:"Kit empreinte & souvenirs bébé",category:"Accessoires",size:"Unique",price:0,stock:0,sku:"REF-005",costPrice:0,avgCost:0},
    {id:"r006",name:"Ensemble garçon short & t-shirt",category:"Ensembles",size:"12-18M",price:0,stock:0,sku:"REF-006",costPrice:0,avgCost:0},
    {id:"r007",name:"Ensemble garçon coloré avec chapeau",category:"Ensembles",size:"12-18M",price:0,stock:0,sku:"REF-007",costPrice:0,avgCost:0},
    {id:"r008",name:"Pyjama Minnie rose (lot)",category:"Ensembles",size:"6-12M",price:0,stock:0,sku:"REF-008",costPrice:0,avgCost:0},
    {id:"r009",name:"Salopette garçon avec nœud",category:"Vêtements",size:"12-18M",price:0,stock:0,sku:"REF-009",costPrice:0,avgCost:0},
    {id:"r010",name:"Ensemble Mickey t-shirt & short",category:"Ensembles",size:"12-18M",price:0,stock:0,sku:"REF-010",costPrice:0,avgCost:0},
    {id:"r011",name:"Lot bodies & pyjamas fille rose",category:"Ensembles",size:"6-12M",price:0,stock:0,sku:"REF-011",costPrice:0,avgCost:0},
    {id:"r012",name:"Lot bodies mixtes (12 pièces)",category:"Ensembles",size:"3-6M",price:0,stock:0,sku:"REF-012",costPrice:0,avgCost:0},
    {id:"r013",name:"Lot bodies & pantalons bébé",category:"Ensembles",size:"6-12M",price:0,stock:0,sku:"REF-013",costPrice:0,avgCost:0},
    {id:"r014",name:"Robe Love avec bandeau",category:"Vêtements",size:"6-12M",price:0,stock:0,sku:"REF-014",costPrice:0,avgCost:0},
    {id:"r015",name:"Robe fleurie avec nœud rose",category:"Vêtements",size:"6-12M",price:0,stock:0,sku:"REF-015",costPrice:0,avgCost:0},
    {id:"r016",name:"Ensemble Best Girl rose",category:"Ensembles",size:"12-18M",price:0,stock:0,sku:"REF-016",costPrice:0,avgCost:0},
    {id:"r017",name:"Robe fille imprimé floral bleu",category:"Vêtements",size:"6-12M",price:0,stock:0,sku:"REF-017",costPrice:0,avgCost:0},
    {id:"r018",name:"Robe fleurie bretelles bleu marine",category:"Vêtements",size:"12-18M",price:0,stock:0,sku:"REF-018",costPrice:0,avgCost:0},
    {id:"r019",name:"Ensemble garçon dinosaure",category:"Ensembles",size:"12-18M",price:0,stock:0,sku:"REF-019",costPrice:0,avgCost:0},
    {id:"r020",name:"Biberons bébé (lot de 3)",category:"Biberons",size:"Unique",price:0,stock:0,sku:"REF-020",costPrice:0,avgCost:0},
    {id:"r021",name:"Ensemble fille papillons blanc/rose",category:"Ensembles",size:"12-18M",price:0,stock:0,sku:"REF-021",costPrice:0,avgCost:0},
    {id:"r022",name:"Robe ours avec peluche",category:"Vêtements",size:"6-12M",price:0,stock:0,sku:"REF-022",costPrice:0,avgCost:0},
    {id:"r023",name:"Ensemble salopette lapin rose",category:"Ensembles",size:"3-6M",price:0,stock:0,sku:"REF-023",costPrice:0,avgCost:0},
    {id:"r024",name:"Set sacs à langer éléphant",category:"Sacs",size:"Unique",price:0,stock:0,sku:"REF-024",costPrice:0,avgCost:0},
    {id:"r025",name:"Siège bébé en peluche lapin rose",category:"Mobilier",size:"Unique",price:0,stock:0,sku:"REF-025",costPrice:0,avgCost:0},
    {id:"r026",name:"Ensemble Minnie rouge à pois",category:"Ensembles",size:"12-18M",price:0,stock:0,sku:"REF-026",costPrice:0,avgCost:0},
    {id:"r027",name:"Siège bébé en peluche ours",category:"Mobilier",size:"Unique",price:0,stock:0,sku:"REF-027",costPrice:0,avgCost:0},
    {id:"r028",name:"Pyjama nœuds bleu naissance",category:"Vêtements",size:"0-3M",price:0,stock:0,sku:"REF-028",costPrice:0,avgCost:0},
    {id:"r029",name:"Lot bonnets hiver garçon",category:"Accessoires",size:"Unique",price:0,stock:0,sku:"REF-029",costPrice:0,avgCost:0},
    {id:"r030",name:"Chaussures bébé dorées avec nœud",category:"Chaussures",size:"0-3M",price:0,stock:0,sku:"REF-030",costPrice:0,avgCost:0},
    {id:"r031",name:"Robe papillon avec nœud beige",category:"Vêtements",size:"2-3A",price:0,stock:0,sku:"REF-031",costPrice:0,avgCost:0},
    {id:"r032",name:"Table et chaises enfant convertible",category:"Mobilier",size:"Unique",price:0,stock:0,sku:"REF-032",costPrice:0,avgCost:0},
    {id:"r033",name:"Set bandeaux roses bébé fille",category:"Accessoires",size:"Unique",price:0,stock:0,sku:"REF-033",costPrice:0,avgCost:0},
    {id:"r034",name:"Chaussures strass & bandeau bleu",category:"Chaussures",size:"0-3M",price:0,stock:0,sku:"REF-034",costPrice:0,avgCost:0},
    {id:"r035",name:"Chaussures nœud doré & bandeau",category:"Chaussures",size:"0-3M",price:0,stock:0,sku:"REF-035",costPrice:0,avgCost:0},
    {id:"r036",name:"Robe salopette rouge fuchsia",category:"Vêtements",size:"12-18M",price:0,stock:0,sku:"REF-036",costPrice:0,avgCost:0},
    {id:"r037",name:"Robe de fête violette à volants",category:"Vêtements",size:"2-3A",price:0,stock:0,sku:"REF-037",costPrice:0,avgCost:0},
    {id:"r038",name:"Robe béret rose avec fleurs",category:"Vêtements",size:"2-3A",price:0,stock:0,sku:"REF-038",costPrice:0,avgCost:0},
    {id:"r039",name:"Ensemble gilet fourrure & jupe",category:"Ensembles",size:"3-4A",price:0,stock:0,sku:"REF-039",costPrice:0,avgCost:0},
    {id:"r040",name:"Robe verte avec nœud & col blanc",category:"Vêtements",size:"2-3A",price:0,stock:0,sku:"REF-040",costPrice:0,avgCost:0},
    {id:"r041",name:"Ensemble fille fraises rouge",category:"Ensembles",size:"12-18M",price:0,stock:0,sku:"REF-041",costPrice:0,avgCost:0},
    {id:"r042",name:"Ensemble veste cuir & robe tulle",category:"Ensembles",size:"3-4A",price:0,stock:0,sku:"REF-042",costPrice:0,avgCost:0},
    {id:"r043",name:"Ensemble cardigan marron & jupe",category:"Ensembles",size:"3-4A",price:0,stock:0,sku:"REF-043",costPrice:0,avgCost:0},
    {id:"r044",name:"Set vaisselle silicone bébé rose",category:"Hygiène",size:"Unique",price:0,stock:0,sku:"REF-044",costPrice:0,avgCost:0},
    {id:"r045",name:"Robe rouge de fête avec nœud",category:"Vêtements",size:"2-3A",price:0,stock:0,sku:"REF-045",costPrice:0,avgCost:0},
    {id:"r046",name:"Ensemble survêtement Rilakkuma jaune",category:"Ensembles",size:"2-3A",price:0,stock:0,sku:"REF-046",costPrice:0,avgCost:0},
    {id:"r047",name:"Robe fleurie avec nœuds roses",category:"Vêtements",size:"12-18M",price:0,stock:0,sku:"REF-047",costPrice:0,avgCost:0},
    {id:"r048",name:"Armoire rangement enfant",category:"Mobilier",size:"Unique",price:0,stock:0,sku:"REF-048",costPrice:0,avgCost:0},
    {id:"r049",name:"Set vaisselle silicone bébé bleu",category:"Hygiène",size:"Unique",price:0,stock:0,sku:"REF-049",costPrice:0,avgCost:0},
    {id:"r050",name:"Kit biberons & accessoires newborn",category:"Biberons",size:"Unique",price:0,stock:0,sku:"REF-050",costPrice:0,avgCost:0},
    {id:"r051",name:"Table à langer & berceau pliable",category:"Mobilier",size:"Unique",price:0,stock:0,sku:"REF-051",costPrice:0,avgCost:0},
    {id:"r052",name:"Lot pyjamas & bodies fille rose",category:"Ensembles",size:"3-6M",price:0,stock:0,sku:"REF-052",costPrice:0,avgCost:0},
    {id:"r053",name:"Berceau cododo bleu turquoise",category:"Literie",size:"Unique",price:0,stock:0,sku:"REF-053",costPrice:0,avgCost:0},
    {id:"r054",name:"Berceau cododo rose",category:"Literie",size:"Unique",price:0,stock:0,sku:"REF-054",costPrice:0,avgCost:0},
    {id:"r055",name:"Trousseau naissance blanc (8 pcs)",category:"Ensembles",size:"0-3M",price:0,stock:0,sku:"REF-055",costPrice:0,avgCost:0},
    {id:"r056",name:"Coffret biberons dBb (3 pcs)",category:"Biberons",size:"Unique",price:0,stock:0,sku:"REF-056",costPrice:0,avgCost:0},
    {id:"r057",name:"Set bain bébé (baignoire, pot, etc.)",category:"Hygiène",size:"Unique",price:0,stock:0,sku:"REF-057",costPrice:0,avgCost:0},
    {id:"r058",name:"Set bain bébé turquoise complet",category:"Hygiène",size:"Unique",price:0,stock:0,sku:"REF-058",costPrice:0,avgCost:0},
    {id:"r059",name:"Berceau mobile musical rose",category:"Literie",size:"Unique",price:0,stock:0,sku:"REF-059",costPrice:0,avgCost:0},
    {id:"r060",name:"Lot bodies & bavoirs bébé violet",category:"Ensembles",size:"3-6M",price:0,stock:0,sku:"REF-060",costPrice:0,avgCost:0},
    {id:"r061",name:"Lit bébé en bois blanc",category:"Literie",size:"Unique",price:0,stock:0,sku:"REF-061",costPrice:0,avgCost:0},
    {id:"r062",name:"Tapis d'éveil musical coloré",category:"Jouets",size:"Unique",price:0,stock:0,sku:"REF-062",costPrice:0,avgCost:0},
    {id:"r063",name:"Siège d'activité bébé bleu",category:"Mobilier",size:"Unique",price:0,stock:0,sku:"REF-063",costPrice:0,avgCost:0},
    {id:"r064",name:"Set pot & bain bébé bleu",category:"Hygiène",size:"Unique",price:0,stock:0,sku:"REF-064",costPrice:0,avgCost:0},
    {id:"r065",name:"Chaussettes hautes fille (lot)",category:"Accessoires",size:"Unique",price:0,stock:0,sku:"REF-065",costPrice:0,avgCost:0},
    {id:"r066",name:"Ensemble fille Minnie beige",category:"Ensembles",size:"12-18M",price:0,stock:0,sku:"REF-066",costPrice:0,avgCost:0},
    {id:"r067",name:"Chaussettes bébé colorées (lot)",category:"Accessoires",size:"Unique",price:0,stock:0,sku:"REF-067",costPrice:0,avgCost:0},
    {id:"r068",name:"Ensemble robe & bandeau fille rose",category:"Ensembles",size:"6-12M",price:0,stock:0,sku:"REF-068",costPrice:0,avgCost:0},
    {id:"r069",name:"Ensemble Mickey rayé garçon",category:"Ensembles",size:"12-18M",price:0,stock:0,sku:"REF-069",costPrice:0,avgCost:0},
    {id:"r070",name:"Ensemble Minnie rouge fille",category:"Ensembles",size:"2-3A",price:0,stock:0,sku:"REF-070",costPrice:0,avgCost:0},
    {id:"r071",name:"Transat balancelle bébé gris",category:"Mobilier",size:"Unique",price:0,stock:0,sku:"REF-071",costPrice:0,avgCost:0},
    {id:"r072",name:"Biberons anti-colique (lot)",category:"Biberons",size:"Unique",price:0,stock:0,sku:"REF-072",costPrice:0,avgCost:0},
    {id:"r073",name:"Couverture emmaillotage rose",category:"Literie",size:"Unique",price:0,stock:0,sku:"REF-073",costPrice:0,avgCost:0},
    {id:"r074",name:"Pantalon bébé fille rose fleuri",category:"Vêtements",size:"6-12M",price:0,stock:0,sku:"REF-074",costPrice:0,avgCost:0},
    {id:"r075",name:"Ensemble hoodie ours bébé rose",category:"Ensembles",size:"6-12M",price:0,stock:0,sku:"REF-075",costPrice:0,avgCost:0},
    {id:"r076",name:"Boîte doseuse lait en poudre",category:"Biberons",size:"Unique",price:0,stock:0,sku:"REF-076",costPrice:0,avgCost:0},
    {id:"r077",name:"Kit soin bébé (brosse, ciseaux...)",category:"Hygiène",size:"Unique",price:0,stock:0,sku:"REF-077",costPrice:0,avgCost:0},
    {id:"r078",name:"Set bonnets & moufles lapin rose",category:"Accessoires",size:"0-3M",price:0,stock:0,sku:"REF-078",costPrice:0,avgCost:0},
    {id:"r079",name:"Ensemble jogging ours bébé rose",category:"Ensembles",size:"6-12M",price:0,stock:0,sku:"REF-079",costPrice:0,avgCost:0},
    {id:"r080",name:"Lot bodies fille imprimés (5 pcs)",category:"Ensembles",size:"3-6M",price:0,stock:0,sku:"REF-080",costPrice:0,avgCost:0},
    {id:"r081",name:"Bodies rayés mixtes (lot)",category:"Ensembles",size:"3-6M",price:0,stock:0,sku:"REF-081",costPrice:0,avgCost:0},
    {id:"r082",name:"Robe de cérémonie fleurie rose",category:"Vêtements",size:"2-3A",price:0,stock:0,sku:"REF-082",costPrice:0,avgCost:0},
    {id:"r083",name:"Couvertures bébé imprimées (lot)",category:"Literie",size:"Unique",price:0,stock:0,sku:"REF-083",costPrice:0,avgCost:0},
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO products (id, name, sku, category, size, price, stock, costPrice, avgCost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const p of catalogue) {
      stmt.run(p.id, p.name, p.sku, p.category, p.size, p.price, p.stock, p.costPrice, p.avgCost);
    }
  });
  tx();
}

module.exports = { getDb, seedIfEmpty };
