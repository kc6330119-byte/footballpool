import {env} from 'cloudflare:workers';
import seed from './seed.json';
import type {Pool,Week} from './pool';
export function database(){if(!env.DB)throw new Error('Pool storage is unavailable.');return env.DB}
export async function readPool(){const db=database();await db.batch(seed.weeks.map(w=>db.prepare('INSERT OR IGNORE INTO pool_weeks (number,payload,revision) VALUES (?,?,0)').bind(w.number,JSON.stringify(w))));const rows=await db.prepare('SELECT number,payload,revision FROM pool_weeks ORDER BY number').all<{number:number;payload:string;revision:number}>();return {pool:{...seed,weeks:rows.results.map(r=>JSON.parse(r.payload) as Week)} as Pool,revisions:Object.fromEntries(rows.results.map(r=>[r.number,r.revision]))}}
export async function saveWeek(week:Week,revision:number,userId:string){const r=await database().prepare('UPDATE pool_weeks SET payload=?,revision=revision+1,updated_by=? WHERE number=? AND revision=?').bind(JSON.stringify(week),userId,week.number,revision).run();return r.meta.changes===1}
