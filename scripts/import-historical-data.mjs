// One-time historical data import: loads the JSON files in
// scripts/import-data/ (extracted from The_Rusti_Shack_Dataset.xlsx and
// The_Rusti_Shack_Apr2026_Update.xlsx) into the live Supabase database,
// so historical spreadsheet history and live web orders sit in the same
// connected tables. See DATA_IMPORT_REPORT.md for the full mapping plan
// and referential-integrity checks this data already passed.
//
// SAFE TO RE-RUN: every upsert targets a real primary key with
// ignoreDuplicates, so running this twice inserts zero additional rows
// the second time. Run order matters (customers before orders/rentals,
// orders before order lines/promotions) because of foreign keys.
//
// Requires SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_URL to be set -
// this script only ever runs on your own machine, never in this chat
// session (the secret key is server-only and never handled by Claude).
// Run with:
//   node --env-file=.env.local scripts/import-historical-data.mjs
//
// Node 20.6+ supports --env-file directly. If your Node version is
// older, export the two variables in your shell first instead.

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'import-data');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.\n' +
      'Run this with: node --env-file=.env.local scripts/import-historical-data.mjs'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });

const BATCH_SIZE = 500;

async function loadJson(filename) {
  const raw = await readFile(path.join(DATA_DIR, filename), 'utf-8');
  return JSON.parse(raw);
}

// Upserts `rows` into `table` in batches, ignoring rows that already
// exist (matched on `onConflict`, a comma-separated PK column list).
// Returns { attempted, batchesOk, batchesFailed, errors }.
async function bulkUpsert(table, rows, onConflict) {
  let batchesOk = 0;
  let batchesFailed = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: true });

    if (error) {
      batchesFailed += 1;
      errors.push(`rows ${i}-${i + batch.length - 1}: ${error.message}`);
    } else {
      batchesOk += 1;
    }
  }

  return { attempted: rows.length, batchesOk, batchesFailed, errors };
}

async function main() {
  console.log('Rusti Shack historical data import starting...\n');

  const steps = [
    { table: 'Customers_Core', file: 'customers_core.json', onConflict: 'CustomerID' },
    { table: 'Customers_Contact', file: 'customers_contact.json', onConflict: 'CustomerID' },
    { table: 'Orders', file: 'orders.json', onConflict: 'OrderID' },
    { table: 'OrderLines', file: 'order_lines.json', onConflict: 'OrderID,LineNumber' },
    { table: 'RentalTransactions', file: 'rental_transactions.json', onConflict: 'RentalID' },
    { table: 'OrderPromotions', file: 'order_promotions.json', onConflict: 'OrderID,PromoCode' },
  ];

  const summary = [];

  for (const step of steps) {
    const rows = await loadJson(step.file);
    console.log(`${step.table}: importing ${rows.length} rows from ${step.file}...`);
    const result = await bulkUpsert(step.table, rows, step.onConflict);
    summary.push({ table: step.table, ...result });
    console.log(
      `  -> ${result.batchesOk} batch(es) OK, ${result.batchesFailed} failed` +
        (result.errors.length ? `\n     first error: ${result.errors[0]}` : '')
    );
  }

  console.log('\n=== Summary ===');
  for (const s of summary) {
    console.log(
      `${s.table}: ${s.attempted} rows attempted, ${s.batchesFailed === 0 ? 'all batches OK' : `${s.batchesFailed} batch(es) failed`}`
    );
  }
  console.log(
    '\nDone. Row counts above are "attempted" (upserted-or-already-present) - ' +
      'run a SELECT count(*) per table if you want the exact stored total, ' +
      'since ignoreDuplicates makes a re-run intentionally show the same attempted count without adding rows.'
  );
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
