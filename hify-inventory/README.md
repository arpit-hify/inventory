# HiFy Inventory

A mobile-first internal tool for managing hardware inventory and Raspberry Pi builds at the HiFy office. Track components, assemble Pi units, generate QR codes, and log all stock movements.

**Live:** [hify-inventory.vercel.app](https://hify-inventory.vercel.app)

---

## What it does

### Asset Inventory
- Track hardware components (SSDs, HATs, coolers, SD cards, power cables, cases, etc.) with brand and vendor info
- See real-time stock levels with low-stock and out-of-stock indicators
- Receive stock to add units, or edit counts directly
- Filter by All / Low Stock / Out of Stock

### Pi Builds
- Assemble Raspberry Pi units by selecting components from inventory
- Each Pi tracks its label, serial number, deployment location, status (In Office / Deployed / Faulty / Returned), components used, and free-text additional components
- Assembling or editing a Pi automatically adjusts component stock levels
- Deleting a Pi returns all components back to inventory

### QR Codes
- Generate a QR code for any Pi build
- QR encodes a direct URL — scanning with any phone camera opens the app and shows the Pi's full detail (components, location, status)
- Download the QR as a PNG to print and stick on the physical unit
- Regenerate at any time if details change

### In-App QR Scanner
- Built-in camera scanner (tap "Scan QR" in the header)
- Scan a Pi's QR code to instantly pull up its detail view

### Activity Log
- Every stock movement is logged: received stock, asset updates, Pi assemblies, Pi updates, Pi disassembly
- View up to 200 recent transactions with timestamps

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 |
| Database | Supabase (Postgres) |
| Deployment | Vercel |
| QR generation | `qrcode` npm package |
| QR scanning | `html5-qrcode` (camera access) |

---

## Local setup

```bash
git clone https://github.com/arpit-hify/inventory.git
cd inventory/hify-inventory
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://utyeotwygezjtkhjwwlr.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying

GitHub auto-deploy is connected to Vercel. If GitHub is down, deploy manually:

```bash
cd hify-inventory
npx vercel --prod
```
