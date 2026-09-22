import 'server-only';
export type Row = {id: string; createdTime: string; fields: Record<string, unknown>};
export function airtableConfigured() {
  return !!(process.env.AIRTABLE_BASE_ID && (process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || process.env.AIRTABLE_API_KEY));
}
export async function airtable<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || process.env.AIRTABLE_API_KEY;
  if (!airtableConfigured()) throw new Error('Airtable settings are missing.');
  const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${path}`, {
    method, headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Airtable request failed (${response.status}).`);
  return response.json() as Promise<T>;
}
export async function listRows(table: string, formula?: string): Promise<Row[]> {
  const rows: Row[] = [];
  let offset: string | undefined;
  do {
    const query = new URLSearchParams({pageSize: '100'});
    if (formula) query.set('filterByFormula', formula);
    if (offset) query.set('offset', offset);
    const page = await airtable<{records: Row[]; offset?: string}>(`${encodeURIComponent(table)}?${query}`);
    rows.push(...page.records); offset = page.offset;
    if (offset) await new Promise(resolve => setTimeout(resolve, 220));
  } while (offset);
  return rows;
}
export async function updateRow(table: string, id: string, fields: Record<string, unknown>) {
  return airtable<Row>(`${encodeURIComponent(table)}/${encodeURIComponent(id)}`, 'PATCH', {fields});
}
export async function createRow(table: string, fields: Record<string, unknown>) {
  return airtable<Row>(encodeURIComponent(table), 'POST', {fields});
}
