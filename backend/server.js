import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || "PIPELINE";

app.get("/", (req, res) => {
  res.send("BCA DEAL SYSTEM LIVE");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    airtableConfigured: Boolean(
      AIRTABLE_API_KEY && AIRTABLE_BASE_ID && AIRTABLE_TABLE
    ),
  });
});

app.get("/api/config", (req, res) => {
  res.json({
    table: AIRTABLE_TABLE,
    hasApiKey: Boolean(AIRTABLE_API_KEY),
    hasBaseId: Boolean(AIRTABLE_BASE_ID),
  });
});

app.listen(PORT, () => {
  console.log(`BCA backend listening on port ${PORT}`);
});
