# Deploying the update through GitHub.com

Everything is pre-filled. Your Apps Script URL is already set in
`public/index.html`, so there is nothing to edit. Upload and commit.

Total time: about 5 minutes.

---

## Before you start

Unzip `clique-booking.zip` somewhere you can find it, e.g. your Desktop.
Inside you should see:

```
clique-booking/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── assets/          ← 13 image files
├── vercel.json
├── README.md
├── DEPLOY.md
└── .gitignore
```

---

## Step 1 — Open your repo

Go to github.com and open the **clique-rentals-booking** repository.
Make sure the branch selector near the top left says **main**. If it says
anything else, switch to main. Vercel only auto-deploys from that branch.

## Step 2 — Start an upload

Click **Add file** (top right, next to the green Code button) →
**Upload files**.

## Step 3 — Drag in the two things that matter

From your unzipped folder, select **both** of these and drag them together
onto the upload area:

- the **`public`** folder (the whole folder, not the files inside it)
- the **`vercel.json`** file

Optionally also drag `README.md` and `DEPLOY.md`.

GitHub keeps the folder structure, so `public/index.html` overwrites the old
one and `public/assets/` gets created.

**Wait for every file to finish uploading.** You should see 15 files listed:
1 index.html, 1 manifest.json, 13 in assets. If the count is short, the drag
missed something — remove and try again before committing.

## Step 4 — Commit

In the box at the bottom, write a commit message, for example:

```
Street-to-studio redesign, 2-day booking window, urgent booking notice
```

Leave **Commit directly to the main branch** selected. Click
**Commit changes**.

## Step 5 — Delete Code.gs from the repo (do this while you are here)

`Code.gs` is committed at the root of this repo, and the repo is **public**.
That file contains your Spreadsheet ID and your Drive folder ID. Anyone who
finds the repo can read both.

On GitHub, open `Code.gs` → the **...** menu at the top right of the file
view → **Delete file** → commit with a message like `Remove Code.gs from repo`.

This changes nothing about how the site works. Your Apps Script lives in the
Apps Script editor, not here, and the site only ever talks to it over the
deployed Web App URL. The included `.gitignore` stops it from being added
again.

Then check your sharing settings, which is what actually decides whether the
exposure mattered:

- Open the **Clique Bookings** spreadsheet → **Share** → under
  *General access*, it should say **Restricted**, not "Anyone with the link".
- Same for the **Clique — Payment Proofs** Drive folder.

If both say Restricted, the IDs on their own give nobody access and you are
fine. If either says "Anyone with the link", switch it to Restricted — with
the ID public, that combination exposes client names, contact numbers,
emails, and payment screenshots.

Note the individual payment-proof *files* are set to link-viewable by the
script itself (`uploadToDrive` does this so you can open them from the sheet).
That is by design, but it means the file links in column I should not be
shared outside your admins.

## Step 6 — Watch Vercel

Go to vercel.com → your clique-rentals-booking project. A new deployment starts on
its own within a few seconds and takes about a minute. Wait for **Ready**.

## Step 7 — Check it

Open https://clique-booking.vercel.app in a **private/incognito window**.
A normal window will show you the cached old version and make you think it
failed.

Run through this list:

- [ ] Hero shows **BOOK A / STUDIO.** with the yellow tape block
- [ ] The photo, the Clique logo, and the ticker strip all load
- [ ] Calendar opens on **2 days from today**, and today plus tomorrow are
      greyed out
- [ ] Your real classes appear as blue slots with the correct names
      (e.g. "Hip Hop", "Femme", "PO10TIAL")
- [ ] Confirmed bookings appear as red **Taken** slots
- [ ] Click an open slot → the modal opens with the hazard strip header
- [ ] Tap BPI / GCash / BDO → the QR images load
- [ ] Check it on your phone

If classes and bookings show up correctly, the connection to your sheet is
working, which is the only thing that could have broken.

---

## If something looks wrong

**Everything shows as Open, no classes or bookings**
The Apps Script URL did not survive. Open `public/index.html` on GitHub,
press `.` or click the pencil, and search for `SCRIPT_URL`. It must read:

```
https://script.google.com/macros/s/AKfycbwWjIqqIosNitBUWdsgh3GBjR_3iKjMP-Cbu0G9NDPvJ0KOb_IZUGdf7BemgFHfhylkVQ/exec
```

**Photo, logo, or QR codes are broken squares**
The `assets` folder did not upload. On GitHub, open `public/` and confirm
`assets/` exists with 13 files inside. Re-upload just that folder if not.

**Page looks unstyled, plain black and white**
Hard refresh: `Ctrl + Shift + R`. If it persists, the deployment is still
building — check Vercel.

**The site looks exactly like before**
You are seeing cache, or the commit landed on a branch other than main.
Check the Vercel dashboard for a deployment matching your commit message.

---

## Rolling back

Nothing here touches your Google Sheet, Drive folder, or Apps Script, so no
booking data is at risk. To undo the site change: Vercel → Deployments →
find the previous one → the "..." menu → **Promote to Production**.
Instant, no GitHub needed.
