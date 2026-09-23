import PoolApp from './pool-app';
import seed from '@/lib/seed.json';
import {visiblePool} from '@/lib/submissions';
import {readPoolCached} from '@/lib/storage';
import type {Pool} from '@/lib/pool';
export const dynamic='force-dynamic';
export default async function Home(){
 let pool=seed as Pool;
 try {pool=(await readPoolCached()).pool} catch { /* The fallback is redacted too. */ }
 return <PoolApp initial={visiblePool(pool,null)}/>;
}
