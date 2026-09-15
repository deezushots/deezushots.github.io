/**
 * Deezu Shots — server
 * Plain Node.js + Express backend. Data is persisted in a single JSON file
 * (data/db.json) and uploaded media is stored in /uploads. No external
 * database is used, per the project brief.
 */

const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DB_PATH = path.join(ROOT, "data", "db.json");
const UPLOADS_DIR = path.join(ROOT, "uploads");
const PUBLIC_DIR = path.join(ROOT, "public");
const PORT = process.env.PORT || 3000;
const DEFAULT_PASSWORD = "DeezuShots2024";

// ---------------------------------------------------------------------------
// Tiny file-based "database"
// ---------------------------------------------------------------------------

function defaultDb() {
  return {
    admin: {
      username: "admin",
      passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
      passwordChanged: false
    },
    business: {
      name: "Deezu Shots",
      tagline: "Photography, videography & documentary storytelling from Kano, Nigeria.",
      heroHeadline: "We frame the moments Northern Nigeria remembers.",
      heroSubtext:
        "Deezu Shots is a Kano-based media house covering photography, videography and documentary work — from matchday sidelines to milestone celebrations.",
      ownerName: "Deezu (Deezu Omm)",
      bio:
        "Deezu Shots is a video, photography, and documentary brand based in Kano, Nigeria. The brand and its media operations are owned and directed by a Northern Nigerian creative entrepreneur popularly known as \"Deezu\" (also known online as Deezu Omm).\n\nBecause Deezu operates primarily as an independent local creator, digital media producer, and entrepreneur rather than a mainstream celebrity, a traditional, comprehensive biography detailing his early childhood, exact birth date, or formal education is not publicly documented. His professional footprint, however, speaks for itself.\n\nUnder the Deezu Shots brand, he oversees professional digital media services including videography, photography, and documentary film production, frequently collaborating with local sports teams, events, and talent across Northern Nigeria to tell visually driven stories.\n\nBefore expanding into sports and event media coverage, Deezu was active in the regional music scene. Operating under his personal brand \"OMM\", he organised and produced collaborative projects such as the regional 'OMM Cypher' in 2020, spotlighting underground hip-hop and trap artists across Northern Nigeria.\n\nHe is closely associated with regional sports media platforms and local football activity in Kano — including Break Through and Salam Sports TV — where he regularly handles high-quality visual coverage of local sports culture.",
      footprint: [
        {
          title: "Multimedia production",
          text: "Videography, photography and documentary production for local sports teams, events and talent across Northern Nigeria."
        },
        {
          title: "Music background",
          text: "Built the OMM label footprint and produced the regional 'OMM Cypher' in 2020, spotlighting Northern Nigerian hip-hop and trap artists."
        },
        {
          title: "Sports & community content",
          text: "Closely tied to Break Through and Salam Sports TV, delivering high-quality visual coverage of local football culture in Kano."
        }
      ],
      address: "Tarauni, Kano State, Nigeria",
      mapQuery: "Tarauni, Kano State, Nigeria",
      mapUrl: "https://maps.app.goo.gl/Kis4cLbwURPQT4Jp9",
      phone: "",
      whatsapp: "",
      email: "",
      instagram: "",
      facebook: "",
      threads: "",
      logo: "/assets/logo.jpg",
      ownerPhoto: "/assets/deezu-portrait.jpg"
    },
    categories: [
      { id: "cat_photo_events", type: "photography", name: "Events" },
      { id: "cat_photo_portraits", type: "photography", name: "Portraits" },
      { id: "cat_photo_sports", type: "photography", name: "Sports" },
      { id: "cat_video_events", type: "videography", name: "Event Coverage" },
      { id: "cat_video_music", type: "videography", name: "Music Videos" },
      { id: "cat_video_sports", type: "videography", name: "Sports Highlights" },
      { id: "cat_doc_sports", type: "documentary", name: "Sports Stories" },
      { id: "cat_doc_community", type: "documentary", name: "Community Features" }
    ],
    media: []
  };
}

function ensureDb() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb(), null, 2));
    console.log("Created data/db.json with default content and admin password:");
    console.log(`  -> ${DEFAULT_PASSWORD}`);
    console.log("  Please log in and change it right away from the dashboard.");
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
}

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
ensureDb();

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(
  session({
    name: "deezushots.sid",
    secret: process.env.SESSION_SECRET || "deezu-shots-local-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 12 // 12 hours
    }
  })
);

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  return res.status(401).json({ error: "Not authenticated." });
}

// ---------------------------------------------------------------------------
// Uploads (multer)
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${newId("media")}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB ceiling (covers short video clips)
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE.includes(file.mimetype) || ALLOWED_VIDEO.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error("Unsupported file type. Please upload a JPG/PNG/WEBP image or an MP4/MOV/WEBM video."));
  }
});

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.post("/api/auth/login", (req, res) => {
  const { password } = req.body || {};
  const db = readDb();
  if (!password || !bcrypt.compareSync(String(password), db.admin.passwordHash)) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  req.session.loggedIn = true;
  res.json({ success: true, passwordChanged: db.admin.passwordChanged });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/api/auth/status", (req, res) => {
  const db = readDb();
  res.json({
    loggedIn: Boolean(req.session && req.session.loggedIn),
    passwordChanged: db.admin.passwordChanged
  });
});

app.post("/api/auth/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const db = readDb();
  if (!currentPassword || !bcrypt.compareSync(String(currentPassword), db.admin.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  db.admin.passwordHash = bcrypt.hashSync(String(newPassword), 10);
  db.admin.passwordChanged = true;
  writeDb(db);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Business info routes
// ---------------------------------------------------------------------------

app.get("/api/business", (req, res) => {
  const db = readDb();
  res.json(db.business);
});

app.put("/api/business", requireAuth, (req, res) => {
  const db = readDb();
  const allowedFields = [
    "name", "tagline", "heroHeadline", "heroSubtext", "ownerName", "bio",
    "footprint", "address", "mapQuery", "mapUrl", "phone", "whatsapp",
    "email", "instagram", "facebook", "threads"
  ];
  for (const key of allowedFields) {
    if (key in req.body) db.business[key] = req.body[key];
  }
  writeDb(db);
  res.json(db.business);
});

// ---------------------------------------------------------------------------
// Category routes
// ---------------------------------------------------------------------------

const VALID_TYPES = ["photography", "videography", "documentary"];

app.get("/api/categories", (req, res) => {
  const db = readDb();
  let categories = db.categories;
  if (req.query.type) categories = categories.filter((c) => c.type === req.query.type);
  res.json(categories);
});

app.post("/api/categories", requireAuth, (req, res) => {
  const { type, name } = req.body || {};
  if (!VALID_TYPES.includes(type) || !name || !String(name).trim()) {
    return res.status(400).json({ error: "A valid type and a category name are required." });
  }
  const db = readDb();
  const category = { id: newId("cat"), type, name: String(name).trim() };
  db.categories.push(category);
  writeDb(db);
  res.status(201).json(category);
});

app.put("/api/categories/:id", requireAuth, (req, res) => {
  const db = readDb();
  const category = db.categories.find((c) => c.id === req.params.id);
  if (!category) return res.status(404).json({ error: "Category not found." });
  const { name, type } = req.body || {};
  if (name && String(name).trim()) category.name = String(name).trim();
  if (type && VALID_TYPES.includes(type)) category.type = type;
  writeDb(db);
  res.json(category);
});

app.delete("/api/categories/:id", requireAuth, (req, res) => {
  const db = readDb();
  const inUse = db.media.some((m) => m.categoryId === req.params.id);
  if (inUse) {
    return res.status(400).json({
      error: "This category still has photos or videos in it. Move or delete those first."
    });
  }
  const before = db.categories.length;
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  if (db.categories.length === before) return res.status(404).json({ error: "Category not found." });
  writeDb(db);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Media routes
// ---------------------------------------------------------------------------

app.get("/api/media", (req, res) => {
  const db = readDb();
  let media = db.media;
  if (req.query.type) media = media.filter((m) => m.type === req.query.type);
  if (req.query.categoryId) media = media.filter((m) => m.categoryId === req.query.categoryId);
  res.json(media.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post("/api/media", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const { title, type, categoryId } = req.body || {};
    if (!req.file) return res.status(400).json({ error: "No file was uploaded." });
    if (!["photo", "video"].includes(type)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Type must be 'photo' or 'video'." });
    }
    const db = readDb();
    if (categoryId && !db.categories.some((c) => c.id === categoryId)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Selected category does not exist." });
    }
    const item = {
      id: newId("media"),
      title: (title || "").trim() || req.file.originalname,
      type,
      categoryId: categoryId || null,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      createdAt: new Date().toISOString()
    };
    db.media.push(item);
    writeDb(db);
    res.status(201).json(item);
  });
});

app.put("/api/media/:id", requireAuth, (req, res) => {
  const db = readDb();
  const item = db.media.find((m) => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Media item not found." });
  const { title, categoryId } = req.body || {};
  if (typeof title === "string" && title.trim()) item.title = title.trim();
  if (categoryId !== undefined) {
    if (categoryId === null || categoryId === "") {
      item.categoryId = null;
    } else if (db.categories.some((c) => c.id === categoryId)) {
      item.categoryId = categoryId;
    } else {
      return res.status(400).json({ error: "Selected category does not exist." });
    }
  }
  writeDb(db);
  res.json(item);
});

app.delete("/api/media/:id", requireAuth, (req, res) => {
  const db = readDb();
  const item = db.media.find((m) => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Media item not found." });
  const filePath = path.join(UPLOADS_DIR, item.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.media = db.media.filter((m) => m.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Static files
// ---------------------------------------------------------------------------

app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Deezu Shots is running at http://localhost:${PORT}`);
});
