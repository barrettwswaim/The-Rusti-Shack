// Shared CSV helpers for every protected /api/management-csv/* export
// route. Kept tiny and dependency-free (no csv library needed).
export function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvRow(fields) {
  return fields.map(csvEscape).join(',') + '\r\n';
}

export function csvResponse(csv, filenameBase) {
  const today = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filenameBase}-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
