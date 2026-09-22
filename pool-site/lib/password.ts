import {randomBytes, scrypt as derive, timingSafeEqual, createHmac, createHash} from 'node:crypto';
const scrypt = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => derive(password, salt, 64, (error, key) => error ? reject(error) : resolve(key)));
export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString('hex');
  return `scrypt:${salt}:${(await scrypt(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, encoded] = stored.split(':');
  const expected = Buffer.from(encoded || '', 'hex');
  const actual = await scrypt(password, salt || 'invalid-account-timing-padding');
  return scheme === 'scrypt' && actual.length === expected.length && timingSafeEqual(actual, expected);
}
function secret() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters.');
  return process.env.AUTH_SECRET;
}
export function digest(value: string) {return createHash('sha256').update(value).digest('hex')}
export function sign(value: object) {
  const body = Buffer.from(JSON.stringify(value)).toString('base64url');
  return body+'.'+createHmac('sha256', secret()).update(body).digest('base64url');
}
export function unsign(value: string): unknown {
  try {
    const [body, signature, extra] = value.split('.');
    if (!body || !signature || extra) return null;
    const actual = Buffer.from(signature, 'base64url');
    const expected = createHmac('sha256', secret()).update(body).digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch {return null}
}
