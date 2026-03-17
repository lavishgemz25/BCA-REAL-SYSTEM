# BCA Real System (Free Stack)

This package bypasses the Replit design-only paywall.

## What is included
- `backend/` Node + Express + Airtable API backend
- `frontend/` simple live dashboard that reads the backend
- `.env.example` with the exact secrets you already created

## Deploy choices
- Backend: Railway or Render-like Node hosting
- Frontend: any static host, or even open `frontend/index.html` locally after setting `BCA_API_URL` in localStorage

## Backend setup
1. Open `backend/`
2. Install dependencies:
   - `npm install`
3. Create `.env` from `.env.example`
4. Run:
   - `npm run dev`
5. Visit `http://localhost:3000/api/health`

## Frontend setup
Open `frontend/index.html` in a browser.
If your backend is not localhost, open browser console and run:

```js
localStorage.setItem('BCA_API_URL', 'https://your-backend-url')
location.reload()
```

## Airtable fields expected
- ADDRESS
- STAGE
- FOLLOW UP DATE
- NOTES
- OFFER SENT
- CONTRACT SENT
- CLOSED
- AI Analysis or AI Notes (optional)

## Notes
- The backend uses Airtable Personal Access Token auth via `AIRTABLE_API_KEY`
- Table name defaults to `PIPELINE`
- This package is intentionally simple so you can deploy fast
