import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || 'PIPELINE';

function requireEnv() {
  const missing = ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID'].filter(
    (key) => !process.env[key]
  );
  if (missing.length) {
    const err = new Error(`Missing environment variables: ${missing.join(', ')}`);
    err.status = 500;
    throw err;
  }
}

async function airtable(path, options = {}) {
  requireEnv();
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Airtable request failed');
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function normalizeStage(value = '') {
  return String(value).trim().toLowerCase();
}

function scoreRecord(fields) {
  const closed = String(fields.CLOSED || '').toLowerCase();
  const offer = String(fields['OFFER SENT'] || '').toLowerCase();
  const contract = String(fields['CONTRACT SENT'] || '').trim();
  const notes = String(fields.NOTES || '').toLowerCase();

  let score = 0;
  if (closed === 'paid') score += 50;
  if (contract) score += 20;
  if (offer && offer !== 'no data') score += 15;
  if (notes.includes('high')) score += 10;
  if (notes.includes('urgent') || notes.includes('contract')) score += 5;
  return Math.min(score, 100);
}

function mapRecord(record) {
  const fields = record.fields || {};
  return {
    id: record.id,
    address: fields.ADDRESS || '',
    stage: fields.STAGE || 'New Lead',
    followUpDate: fields['FOLLOW UP DATE'] || '',
    notes: fields.NOTES || '',
    offerSent: fields['OFFER SENT'] || '',
    contractSent: fields['CONTRACT SENT'] || '',
    closed: fields.CLOSED || '',
    aiAnalysis: fields['AI Analysis'] || fields['AI Notes'] || '',
    priorityScore: scoreRecord(fields),
    createdTime: record.createdTime || ''
  };
}

app.get('/api/health', (_req, res) => {
  const configured = Boolean(AIRTABLE_API_KEY && AIRTABLE_BASE_ID);
  res.json({ ok: true, configured, table: AIRTABLE_TABLE });
});

app.get('/api/deals', async (_req, res, next) => {
  try {
    const data = await airtable('?maxRecords=100&sort%5B0%5D%5Bfield%5D=CREATED_TIME&sort%5B0%5D%5Bdirection%5D=desc').catch(async () => {
      return airtable('?maxRecords=100');
    });
    const deals = (data.records || []).map(mapRecord);
    res.json({ deals });
  } catch (err) {
    next(err);
  }
});

app.get('/api/dashboard', async (_req, res, next) => {
  try {
    const data = await airtable('?maxRecords=100');
    const deals = (data.records || []).map(mapRecord);
    const stageCounts = {
      'new leads': 0,
      analyzing: 0,
      'making offers': 0,
      negotiating: 0,
      'under contract': 0,
      closed: 0,
      other: 0
    };

    for (const deal of deals) {
      const stage = normalizeStage(deal.stage);
      if (stage.includes('new')) stageCounts['new leads'] += 1;
      else if (stage.includes('analyz')) stageCounts.analyzing += 1;
      else if (stage.includes('offer')) stageCounts['making offers'] += 1;
      else if (stage.includes('negotiat')) stageCounts.negotiating += 1;
      else if (stage.includes('contract')) stageCounts['under contract'] += 1;
      else if (stage.includes('close') || String(deal.closed).toLowerCase() === 'paid') stageCounts.closed += 1;
      else stageCounts.other += 1;
    }

    const alerts = deals
      .filter((d) => d.priorityScore >= 50 || String(d.closed).toLowerCase() !== 'paid')
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        text: d.contractSent
          ? `${d.address || 'Unknown lead'} has a contract/payment reference on file.`
          : `${d.address || 'Unknown lead'} needs follow-up.`
      }));

    res.json({
      metrics: {
        totalLeads: deals.length,
        highPriority: deals.filter((d) => d.priorityScore >= 70).length,
        paid: deals.filter((d) => String(d.closed).toLowerCase() === 'paid').length
      },
      stageCounts,
      alerts,
      recentDeals: deals.slice(0, 10)
    });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    error: err.message || 'Unexpected server error',
    details: err.payload || null
  });
});

app.listen(PORT, () => {
  console.log(`BCA backend listening on port ${PORT}`);
});
