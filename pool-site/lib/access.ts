import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from './storage';
import type {Player} from './pool';
export async function access(){
 const user=await getChatGPTUser();
 const adminEmail=((env as unknown as {ADMIN_EMAIL?:string}).ADMIN_EMAIL||'').trim().toLowerCase();
 if(!user)return {user:null,admin:false,player:null as Player|null,configured:!!adminEmail};
 const email=user.email.trim().toLowerCase(),db=database();
 if(adminEmail)await db.prepare('INSERT OR IGNORE INTO members (player,email,user_id) VALUES (?,?,NULL)').bind('Kevin',adminEmail).run();
 // Bind an invited email to the stable, site-scoped identity on its first sign-in.
 await db.prepare('UPDATE members SET user_id=? WHERE email=? AND user_id IS NULL').bind(user.userId,email).run();
 const member=await db.prepare('SELECT player FROM members WHERE user_id=? AND email=?').bind(user.userId,email).first<{player:Player}>();
 return {user,admin:!!adminEmail&&email===adminEmail,player:member?.player??null,configured:!!adminEmail};
}
