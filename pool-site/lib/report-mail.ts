import 'server-only';
import {createHmac} from 'node:crypto';
import nodemailer from 'nodemailer';
import {z} from 'zod';
import {adminEmail,members} from './access';
import {players,type Player} from './pool';
import {weeklyReport} from './weekly-report';
export function gmailUser(){return (process.env.GMAIL_USER || adminEmail()).trim().toLowerCase()}
export function mailConfigured(){return z.string().email().safeParse(gmailUser()).success && !!process.env.GMAIL_APP_PASSWORD?.replace(/\s/g,'')}
export async function reportRecipients(){
 const rows=await members();
 return players.map(player=>{
  const row=rows.find(r=>r.fields['Player Name']===player);
  const email=String(row?.fields.Email||'').trim();
  return {player,email,available:row?.fields.Active===true && z.string().email().safeParse(email).success};
 });
}
export function reportVersion(report:ReturnType<typeof weeklyReport>,recipients:Awaited<ReturnType<typeof reportRecipients>>){
 if(!process.env.AUTH_SECRET)throw new Error('Authentication settings missing.');
 return createHmac('sha256',process.env.AUTH_SECRET).update(JSON.stringify({report,recipients})).digest('hex');
}
export async function sendReport(report:ReturnType<typeof weeklyReport>,recipients:{player:Player;email:string}[]){
 if(!mailConfigured())throw new Error('Gmail delivery is not configured.');
 const transport=nodemailer.createTransport({
  host:'smtp.gmail.com',port:465,secure:true,
  auth:{user:gmailUser(),pass:process.env.GMAIL_APP_PASSWORD!.replace(/\s/g,'')},
  connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,
  disableFileAccess:true,disableUrlAccess:true,
 });
 try{
  // BCC keeps the distribution list private and sends only to checked players.
  const result=await transport.sendMail({
   from:{name:'Collins Phillips Football Pool',address:gmailUser()},
   to:'undisclosed-recipients:;',bcc:recipients.map(r=>r.email),
   replyTo:gmailUser(),subject:report.subject,html:report.html,text:report.text,
  });
  const accepted=new Set(result.accepted.map(value=>String(value).toLowerCase()));
  return {sent:recipients.filter(r=>accepted.has(r.email.toLowerCase())).map(r=>r.player),failed:recipients.filter(r=>!accepted.has(r.email.toLowerCase())).map(r=>r.player)};
 }finally{transport.close()}
}
