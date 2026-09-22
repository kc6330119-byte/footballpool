import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {members, isAdmin, authVersion, SESSION_COOKIE} from '@/lib/access';
import {digest, hashPassword, sign, verifyPassword} from '@/lib/password';
import {updateRow} from '@/lib/airtable';
import {sameOrigin} from '@/lib/validation';
const input = z.object({action: z.enum(['login','setup','logout']), email: z.string().email().max(254).optional(), password: z.string().min(12).max(128).optional(), token: z.string().max(200).optional()});
const genericError = () => NextResponse.json({error: 'Unable to sign in. Check your details or ask Kevin for a new setup link.'}, {status: 401});
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({error: 'Request origin is not allowed.'}, {status: 403});
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({error: 'Enter your email and a password of 12–128 characters.'}, {status: 400});
    const data = parsed.data;
    if (data.action === 'logout') {
      const response = NextResponse.json({ok: true});
      response.cookies.set(SESSION_COOKIE, '', {path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production'});
      return response;
    }
    // Fail before saving a password if session configuration is incomplete.
    sign({check: true});
    const email = (data.email || '').trim().toLowerCase();
    const row = (await members()).find(r => r.fields.Active === true && String(r.fields.Email || '').toLowerCase() === email);
    if (!row || !data.password) {await verifyPassword(data.password || '', ''); return genericError()}
    const stored = String(row.fields['Password Hash'] || '');
    if (data.action === 'setup') {
      const tokenHash = digest(data.token || '');
      const invited = data.token && tokenHash === row.fields['Setup Token Hash'] && Date.parse(String(row.fields['Setup Expires'] || '')) > Date.now();
      const bootstrap = !stored && isAdmin(row) && process.env.ADMIN_SETUP_TOKEN && process.env.ADMIN_SETUP_TOKEN.length >= 32 && tokenHash === digest(process.env.ADMIN_SETUP_TOKEN);
      if (!invited && !bootstrap) return genericError();
      row.fields['Password Hash'] = await hashPassword(data.password);
      await updateRow('Players', row.id, {'Password Hash': row.fields['Password Hash'], 'Setup Token Hash': null, 'Setup Expires': null, 'Failed Attempts': 0, 'Locked Until': null});
    } else {
      if (Date.parse(String(row.fields['Locked Until'] || '')) > Date.now()) return genericError();
      if (!await verifyPassword(data.password, stored)) {
        const attempts = Number(row.fields['Failed Attempts'] || 0) + 1;
        await updateRow('Players', row.id, {'Failed Attempts': attempts, 'Locked Until': attempts >= 5 ? new Date(Date.now()+15*60*1000).toISOString() : null});
        return genericError();
      }
      if (row.fields['Failed Attempts'] || row.fields['Locked Until']) await updateRow('Players', row.id, {'Failed Attempts': 0, 'Locked Until': null});
    }
    const response = NextResponse.json({ok: true}, {headers: {'Cache-Control': 'no-store'}});
    response.cookies.set(SESSION_COOKIE, sign({id: row.id, email, version: authVersion(row), exp: Date.now()+7*86400000, nonce: randomBytes(12).toString('hex')}), {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7*86400});
    return response;
  } catch (error) {
    console.error('Authentication unavailable', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({error: 'Sign-in is temporarily unavailable. Check the site’s server settings or try again later.'}, {status: 503});
  }
}
