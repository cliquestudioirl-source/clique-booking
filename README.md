# Clique Dance Studio — Booking Site

Static studio rental booking site for Clique Dance Studio, Baguio City.

## Project Structure

```
clique-booking/
├── public/
│   └── index.html     ← The full booking site (self-contained)
├── vercel.json        ← Vercel deployment config
├── .gitignore
└── README.md
```

## Before You Deploy

### Step 1 — Google Apps Script (Backend)

1. Go to [Google Sheets](https://sheets.google.com) → create a new spreadsheet
2. Copy the **Spreadsheet ID** from the URL
3. Create a folder in Google Drive called **"Clique — Payment Proofs"** and copy its ID from the URL
4. Go to **Extensions → Apps Script**
5. Paste the contents of `Code.gs` (keep this file local — do not push to GitHub if repo is public)
6. Replace the two placeholders at the top:
   - `YOUR_SPREADSHEET_ID_HERE`
   - `YOUR_DRIVE_FOLDER_ID_HERE`
7. Run `setupSheets()` once
8. Click **Deploy → New deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
9. Copy the **Web App URL**

### Step 2 — Update index.html

In `public/index.html`, find and replace:

```
YOUR_APPS_SCRIPT_WEB_APP_URL_HERE
```

with your Web App URL from Step 1.

### Step 3 — Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Framework Preset: **Other**
5. Output Directory: `public` (auto-detected from vercel.json)
6. Click **Deploy**

## Studios

| Studio | Capacity | Rate |
|--------|----------|------|
| Studio A | 40 pax max | ₱700/hr |
| Studio B | 6 pax max | ₱500/hr |

**Hours:** 8AM – 12AM · **Cutoff:** 4 hrs before start · **Payment:** BPI, GCash, BDO
