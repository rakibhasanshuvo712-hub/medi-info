# MedPulse — Live Pharmaceutical Index & Manufacturer Sync

**MedPulse** is an online medicine directory and clinical monograph index modeled after MedEx, enhanced with real-time manufacturer product synchronization via **Netlify Functions** and **Netlify Blobs**.

## Key Features
- **Instant Global Search (`/`)**: Search across brand names, generic names, strengths, and pharmaceutical companies.
- **Full Clinical Monographs**: Indications, pharmacology, dosage & administration, contraindications, side effects, interactions, pregnancy category, and storage conditions.
- **Cross-Brand Price Comparison**: View alternate brands for every generic side-by-side with unit price (BDT), pack size, and availability status.
- **Live Company Product Updates**:
  - **Company Portal**: Manufacturers can publish new launches, revise unit prices, or update availability in real time.
  - **Online JSON Feeds (`/api/company-feed/:companyId`)**: Batch-sync or connect external HTTPS product feeds.
  - **Webhook API (`POST /api/webhook/company-update`)**: Receive instant product updates from pharmaceutical ERP/e-commerce systems.
  - **Scheduled Auto-Sync (`netlify/functions/scheduled-sync.mts`)**: Runs every 15 minutes in production to pull online company feeds automatically.

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
