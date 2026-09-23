import {NextResponse} from 'next/server';
import {readPoolCached} from '@/lib/storage';
import {access} from '@/lib/access';
import {visiblePool} from '@/lib/submissions';
export const dynamic='force-dynamic';
export async function GET(){try{const a=await access();if(!a.user)return NextResponse.json({error:'Sign in to view saved pool data.'},{status:401});if(!a.admin&&!a.player)return NextResponse.json({error:a.configured?'Your account has not been added to this pool.':'Administrator setup is needed.'},{status:403});const saved=await readPoolCached();return NextResponse.json({pool:visiblePool(saved.pool,a.player),revisions:saved.revisions,access:{admin:a.admin,player:a.player,email:a.user.email}},{headers:{'Cache-Control':'no-store'}})}catch(e){console.error('Pool load failed',e);return NextResponse.json({error:'Pool storage is unavailable. Please try again.'},{status:503})}}
