import {NextResponse} from 'next/server';
import {readPool} from '@/lib/storage';
import {access} from '@/lib/access';
export const dynamic='force-dynamic';
export async function GET(){try{const a=await access();if(!a.user)return NextResponse.json({error:'Sign in to view saved pool data.'},{status:401});if(!a.admin&&!a.player)return NextResponse.json({error:a.configured?'Your account has not been added to this pool.':'Administrator setup is needed.'},{status:403});return NextResponse.json({...await readPool(),access:{admin:a.admin,player:a.player,email:a.user.email}},{headers:{'Cache-Control':'no-store'}})}catch(e){console.error('Pool load failed',e);return NextResponse.json({error:'Pool storage is unavailable. Please try again.'},{status:503})}}
