import {z} from 'zod';
import {deadlineUTC} from './deadline';
import {players} from './pool';
const point=z.number().min(0).max(300).nullable();
const picks=z.object({Bryan:z.string().max(100),Ed:z.string().max(100),Mike:z.string().max(100),Kevin:z.string().max(100)});
const totals=z.object({Bryan:point,Ed:point,Mike:point,Kevin:point});
const dues=z.object({Bryan:z.number().min(0).max(10000),Ed:z.number().min(0).max(10000),Mike:z.number().min(0).max(10000),Kevin:z.number().min(0).max(10000)});
const game=z.object({id:z.string().min(1).max(80),matchup:z.string().min(1).max(200),teams:z.array(z.string().min(1).max(100)).length(2),picks,winner:z.string().max(100),score:z.string().max(200),kickoff:z.string().refine(s=>!s||!Number.isNaN(Date.parse(s)))}).refine(g=>g.teams[0]!==g.teams[1]).refine(g=>!g.winner||g.winner==='Push'||g.teams.includes(g.winner));
export const weekSchema=z.object({number:z.number().int().min(1).max(18),games:z.array(game).max(50),totalPoints:totals,recordedTotals:totals,winner:z.union([z.literal(''),z.enum(players)]),earnings:z.number().min(0).max(10000),note:z.string().max(500),dues,teamEarnings:z.record(z.number().min(0).max(10000)),actualTotal:point,locked:z.boolean(),deadlineLocal:z.string().refine(s=>Number.isFinite(deadlineUTC(s)))}).refine(w=>new Set(w.games.map(g=>g.id)).size===w.games.length);
export const picksSchema=z.object({week:z.number().int().min(1).max(18),revision:z.number().int().min(0),picks:z.record(z.string().max(100)),totalPoints:point});
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin}
