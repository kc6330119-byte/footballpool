import 'server-only';
import {cookies} from 'next/headers';
import {listRows, type Row} from './airtable';
import {digest, unsign} from './password';
import {players, type Player} from './pool';
export const SESSION_COOKIE = 'cp_pool_session';
export const adminEmail = () => (process.env.ADMIN_EMAIL || 'kc6330119@gmail.com').trim().toLowerCase();
export async function members() {
  return (await listRows('Players')).filter(r => players.includes(r.fields['Player Name'] as Player));
}
export function isAdmin(row: Row) {
  return row.fields.Active === true && String(row.fields.Email || '').toLowerCase() === adminEmail() && row.fields['Player Name'] === 'Kevin';
}
export function authVersion(row: Row) {return digest(String(row.fields['Password Hash'] || ''))}
export async function access(): Promise<{user: {userId:string;email:string;displayName:string}|null;admin:boolean;player:Player|null;configured:boolean}> {
  const none = {user: null, admin: false, player: null as Player|null, configured: !!process.env.AUTH_SECRET};
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return none;
  const session = unsign(token) as {id?: string; email?: string; version?: string; exp?: number}|null;
  if (!session?.id || !session.exp || session.exp <= Date.now()) return none;
  const row = (await members()).find(r => r.id === session.id && r.fields.Active === true);
  if (!row || String(row.fields.Email || '').toLowerCase() !== session.email || session.version !== authVersion(row) || !row.fields['Password Hash']) return none;
  return {user: {userId: row.id, email: session.email!, displayName: String(row.fields['Player Name'])}, admin: isAdmin(row), player: row.fields['Player Name'] as Player, configured: true};
}
