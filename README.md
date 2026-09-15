# Deezu Shots — website + dashboard

A showcase website for Deezu Shots (photography, videography & documentary,
Tarauni, Kano State) with a password-protected dashboard for managing
everything: business info, portfolio categories, and uploaded photos/videos.

It's built with plain HTML/CSS/JavaScript on the front end and a small
Node.js + Express server on the back end. There's no external database —
all content lives in one file, `data/db.json`, and uploaded files are saved
to the `uploads/` folder. This keeps the whole project self-contained and
easy to move or back up.

## 1. Requirements

- [Node.js](https://nodejs.org) version 16 or newer (includes `npm`)

## 2. Install & run

Open a terminal in this project folder and run:

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser. That's the live site.

The first time the server starts, it creates `data/db.json` automatically
and prints a default admin password to the terminal. That password is also
written here for convenience:

```
Default password: DeezuShots2024
```

Go to **http://localhost:3000/admin/login.html**, log in with that
password, and change it right away from the **Security** tab.

## 3. Using the dashboard

Log in at `/admin/login.html`, then you can:

- **Business info** — edit the business name, tagline, hero text, owner
  bio, career-footprint highlights, address, contact details and social
  links. Saving here updates the live site immediately.
- **Categories** — add, rename, or delete categories under Photography,
  Videography and Documentary. A category can't be deleted while it still
  has photos or videos in it — move or delete those first.
- **Photos & videos** — upload a file, give it a title, and assign it to a
  category. You can re-title or re-categorize an item, or delete it, at
  any time.
- **Security** — change the dashboard password.

Everything you upload is saved in the `uploads/` folder, and every piece of
content (business info, categories, media metadata, and your hashed
password) is saved in `data/db.json`.

## 4. Project structure

```
deezu-shots/
├── server.js              Express server & API
├── package.json
├── data/
│   └── db.json             created automatically on first run
├── uploads/                 uploaded photos & videos are stored here
└── public/
    ├── index.html            the public website
    ├── css/style.css
    ├── js/main.js
    ├── assets/               logo + owner photo
    └── admin/
        ├── login.html
        ├── dashboard.html
        ├── css/admin.css
        └── js/{login,dashboard}.js
```

## 5. Notes on hosting it for real

- This is set up for a single admin user, which fits a small business site.
- Sessions use Express's default in-memory session store, which is fine for
  local use or a small VPS with one server process. If you deploy to a host
  that runs multiple server instances or restarts the process often,
  consider swapping in a persistent session store (e.g. `connect-sqlite3`)
  so logins don't get interrupted — ask your developer if you're not sure
  what this means for your host.
- Put the whole project on any Node-capable host (a small VPS, Render,
  Railway, etc.), run `npm install && npm start`, and point your domain at
  it. Make sure the `uploads/` and `data/` folders are on persistent
  storage (not wiped on redeploy) so your content survives updates.
- Back up `data/db.json` and the `uploads/` folder from time to time —
  together they are your entire website's content.
