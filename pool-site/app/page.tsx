import seed from '@/lib/seed.json';
import {visiblePool} from '@/lib/submissions';
import {readPoolCached} from '@/lib/storage';
import type {Pool} from '@/lib/pool';
import Landing from './landing/landing';
import {landingModel} from './landing/model';
export const dynamic='force-dynamic';
export default async function Home(){
 let pool=seed as Pool,fromAirtable=false;
 try {pool=(await readPoolCached()).pool;fromAirtable=true} catch { /* Clearly label the safe workbook fallback. */ }
 return <Landing data={landingModel(visiblePool(pool,null),fromAirtable)}/>;
}
