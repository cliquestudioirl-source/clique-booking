# Clique Dance Studio — Booking Site

Static site on Vercel, talking to the existing Google Apps Script Web App.
**The Apps Script (`Code.gs`) is unchanged.** Do not redeploy it.

## Repo structure

```
clique-booking/
├── public/
│   ├── index.html          ← the entire site (61 KB)
│   ├── manifest.json
│   └── assets/             ← images, served with 1-year cache headers
│       ├── hero.jpg / .webp
│       ├── hero-mobile.jpg / .webp
│       ├── logo.png / .webp
│       ├── favicon.png, apple-touch-icon.png
│       └── bpi|gcash|bdo -logo.png, -qr.jpg
├── vercel.json
├── .gitignore
└── README.md
```

## Deploy

1. Open `public/index.html`, find:

   ```js
   const SCRIPT_URL    = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```

   Replace with your existing Apps Script Web App URL. Nothing else needs changing.

2. Push to GitHub → import on vercel.com → Framework: **Other** → Deploy.
   `vercel.json` already sets the output directory and cache headers.

`Code.gs` is gitignored so the spreadsheet and Drive IDs never land in the repo.

## What changed

### Booking rules

| Rule | Before | Now |
| --- | --- | --- |
| Lead time | 4 hours | **2 days** — if today is Sep 4, the earliest bookable date is Sep 6 |
| Earlier dates | shown, greyed | not selectable at all, with a "message us" route |
| Max duration | 8 hrs, only capped by midnight | 8 hrs, **also capped by the next class/booking** — you can no longer start a 4-hr block an hour before a class |

The urgent-booking route is surfaced at four points, deliberately weighted
toward where people actually get stuck:

1. **Hero alert** — a tape-block notice under the headline, links to the callout.
2. **Under the calendar** — explains *why* the next two days are greyed out and
   names the real first bookable date (e.g. "Sun, Sep 6, 2026"), because a
   greyed-out day with no reason is where people bail.
3. **Sidebar callout** — now the first card in the sidebar (above the studio
   flyer), framed in hazard tape, with Instagram / Facebook / Call buttons. On
   mobile this puts it above the calendar entirely.
4. **Inside the booking modal**, in the non-refundable notice.

Any link pointing at `#urgent` scrolls to the callout and flashes it, so it is
obvious where you landed.

To change the lead time later, edit one line:

```js
const LEAD_DAYS = 2;   // near the top of the <script> block
```

`MAX_MONTHS` (how far ahead the picker goes, default 6) and `HOURS_START` /
`HOURS_END` sit next to it.

### Design — street to studio

The visual direction is built around Clique starting outdoors, not in a studio:

- **Hi-vis marking tape yellow** (`#f5cf1e`) replaced the old luxury gold. Reads
  as paint, tape, and signage rather than premium branding.
- **Space Mono** carries every label, time, status and reference number —
  stencil and signage energy. Overused Grotesk stays for headlines, now set in
  heavy uppercase.
- Hero headline is half outlined (spray stencil) and half a tilted tape block.
- Concrete grain sits over the whole page; the hero fades out through a halftone
  dot screen; the hero image is desaturated and pushed to higher contrast.
- A ticker strip under the hero runs the origin line and the studio facts.
- **Origin block** below it says plainly where Clique came from — parking lots,
  hallways, sidewalks.
- Sidebar cards are pasted flyers with a strip of tape at the corner; house rules
  are numbered 01-05.
- Selected date and time tiles are stamped tape blocks, tilted a degree or two.
- Taken and class slots get struck-through times.
- Hazard tape marks the rules that actually matter.

**The booking modal is now a permit stub:** hazard strip across the header, mono
docket line (`STUDIO A / SUN, SEP 6, 2026 / FROM 12:00 PM`), a perforated
tear-off footer holding the amount and the CTA, an ✕-mark checklist styled as a
sign-off block, and a rotated `RESERVED / PENDING REVIEW` rubber stamp on the
success screen.

Copy moved with it: "Reserve the floor", "Lock it in", "Who's booking",
"Send it here", "Slot's on hold", `Open` / `Taken` instead of
`Available` / `Booked`.

- Month calendar replaces the day dropdown. Green dots on each day show roughly
  how much is still open, so people can scan a month at a glance.
- Time slots are a chip grid instead of a 16-row list — the same component on
  desktop and mobile, which removed the entire duplicated mobile render path.
- Booking modal now has a sticky footer showing **Due now** and the CTA, so the
  amount is visible without scrolling back up.
- Two-column layout on desktop: studio facts, urgent-booking contact, and house
  rules live in a sidebar instead of being buried in the modal.
- Payment channel buttons use the real BPI / GCash / BDO marks (those logos were
  already in the file but were never rendered).
- File upload shows a thumbnail of the payment screenshot before submitting.

### Performance

| | Before | Now |
| --- | --- | --- |
| index.html | 861 KB | **61 KB** |
| Hero image | 474 KB base64, blocking | 77 KB WebP on mobile, 223 KB on desktop, cached a year |
| Repeat visits | full 861 KB again | ~61 KB, images from cache |

Images were pulled out of base64 into real files, resized and re-encoded, with
WebP plus JPEG fallbacks and separate mobile art.

### Behaviour kept identical

The request contract with Apps Script is byte-for-byte the same:

- `GET  ?action=getSlots&studio=A|B&date=YYYY-MM-DD&token=…`
- `POST {action, token, studio, name, contact, instagramOrEmail, date,`
  `startTime, endTime, numberOfPeople, fileData, fileName, fileType, paymentType}`

Also unchanged: the shared token, formula-injection stripping on text fields, PH
phone normalisation, 20% downpayment maths, capacity limits, the four-item
checklist, and the reference-number success screen.

## Optional, for later (needs a Code.gs change)

Not applied, since the brief was to leave the Apps Script alone:

1. **`handleGetSlots` ignores its `date` parameter.** Every calendar load returns
   every booking ever made, for all dates. Fine now, slow at a few thousand rows.
2. **No `LockService` around the conflict check.** Two people submitting the same
   slot in the same second can both pass the check and both get written.
3. **`formatTime` / `formatDate` are timezone-sensitive.** If the Apps Script
   project timezone is not Asia/Manila, a 09:00 class can render as 08:00.
   Check File → Project Settings → Time zone.
