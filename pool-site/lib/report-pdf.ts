import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument, StandardFonts, rgb, type PDFFont} from 'pdf-lib';
import type {weeklyReport} from './weekly-report';

// The PDF uses the same public snapshot as the email, never a second pool read.
export async function newsletterPdf(report:ReturnType<typeof weeklyReport>){
 const data=report.document, pdf=await PDFDocument.create();
 const body=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold), display=await pdf.embedFont(StandardFonts.TimesRomanBold);
 const green=rgb(.07,.23,.17), ink=rgb(.14,.22,.18), gold=rgb(.72,.56,.22), cream=rgb(.98,.97,.94);
 // Standard PDF fonts support Western text; safely replace unsupported symbols rather than fail delivery.
 const clean=(s:string)=>Array.from(s.replace(/[\u2010-\u2015]/g,'-').replace(/[\r\n\t]+/g,' ')).map(c=>{try{body.encodeText(c);return c}catch{return '?'}}).join('');
 const wrap=(value:string,width:number,size:number,font:PDFFont=body)=>{
  const lines:string[]=[];let line='';
  for(const word of clean(value).split(/\s+/)){
   if(font.widthOfTextAtSize(line?line+' '+word:word,size)<=width){line=line?line+' '+word:word;continue}
   if(line){lines.push(line);line=''}
   for(const c of word){if(font.widthOfTextAtSize(line+c,size)>width){lines.push(line);line=''}line+=c}
  }
  if(line)lines.push(line);return lines;
 };
 let page=pdf.addPage([612,792]),y=748;
 function paint(){page.drawRectangle({x:0,y:0,width:612,height:792,color:cream});page.drawRectangle({x:36,y:760,width:540,height:4,color:gold})}
 paint();
 function newPage(){page=pdf.addPage([612,792]);paint();page.drawText('THE FINAL WHISTLE  /  WEEK '+data.number,{x:36,y:737,size:11,font:bold,color:green});y=710}
 function room(height:number){if(y-height<52)newPage()}
 function paragraph(value:string,size=10,font:PDFFont=body,color=ink){
  const lines=wrap(value,540,size,font),step=size*1.45;
  for(const line of lines){room(step);page.drawText(line,{x:36,y:y-size,size,font,color});y-=step}y-=7;
 }
 function section(title:string){room(75);y-=12;paragraph(title,20,display,green)}
 function table(headers:string[],rows:string[][]){
  const widths=[150,125,140,125];
  function row(cells:string[],header=false){
   const lines=cells.map((v,i)=>wrap(v,widths[i]-16,10,header?bold:body)),height=Math.max(...lines.map(l=>l.length))*14+16;
   if(y-height<52){newPage();if(!header)row(headers,true)}
   page.drawRectangle({x:36,y:y-height,width:540,height,color:header?green:rgb(.94,.94,.90)});
   let x=44;lines.forEach((ls,i)=>{ls.forEach((l,j)=>page.drawText(l,{x,y:y-18-j*14,size:10,font:header?bold:body,color:header?rgb(1,1,1):ink}));x+=widths[i]});y-=height+2;
  }
  room(95);row(headers,true);rows.forEach(r=>row(r));y-=6;
 }
 pdf.setTitle(clean(report.subject));pdf.setAuthor('Collins Phillips Football Pool');
 paragraph('COLLINS PHILLIPS FOOTBALL POOL  /  EST. 2023',10,bold,gold);
 paragraph('THE FINAL WHISTLE',34,display,green);
 paragraph(`${data.season}  /  WEEK ${data.number}  /  ${data.complete?'WEEKLY RESULTS':'RESULTS IN PROGRESS'}`,10,bold);
 y-=10;paragraph(data.winnerLabel,9,bold,gold);paragraph(data.headline,27,display,green);paragraph(data.intro,11);paragraph('Weekly winner: '+data.winnerText,11,bold);
 if(data.note)paragraph("Commissioner's note: "+data.note,10);
 // Only allow the three bundled images. No remote fetches or caller-controlled file paths.
 if(!['namath.jpeg','butkus.jpeg','walker.jpeg'].includes(data.photo))throw new Error('Unknown newsletter photo');
 const image=await pdf.embedJpg(await readFile(path.join(process.cwd(),'public/newsletter',data.photo)));
 const scale=Math.min(540/image.width,185/image.height),width=image.width*scale,height=image.height*scale;
 room(height+40);y-=8;page.drawImage(image,{x:(612-width)/2,y:y-height,width,height});y-=height+8;
 paragraph('FROM THE FOOTBALL SCRAPBOOK / Photo supplied by the pool administrator',8,body);
 section('The weekly scoreboard');table(['Player','Correct picks','Total-points pick','Distance'],data.weekly);paragraph(data.tiebreaker,9);
 section('The season chase');paragraph(data.seasonIntro,11);table(['Player','Correct picks','Weekly wins','Earnings'],data.standings);
 section('Under the lights');data.notes.forEach(n=>paragraph(n,10));
 section('Every game. Every call.');
 data.games.forEach((g,i)=>{
  const height=wrap(g.matchup,540,12,bold).length*17.4+wrap(g.result,540,10).length*14.5+wrap(g.picks,540,9).length*13.05+36;
  room(height);paragraph(`${String(i+1).padStart(2,'0')} / ${g.matchup}`,12,bold);paragraph(g.result,10);paragraph(g.picks,9);
  page.drawLine({start:{x:36,y},end:{x:576,y},thickness:.5,color:gold});y-=10;
 });
 room(100);section('Back to the pool');paragraph(data.link,9);paragraph('Results reflect saved pool data at the time of sending. Sent by your pool administrator to selected players.',9);
 const pages=pdf.getPages();pages.forEach((p,i)=>p.drawText(`COLLINS PHILLIPS / WEEK ${data.number}                                           ${i+1} / ${pages.length}`,{x:36,y:28,size:8,font:body,color:green}));
 return {filename:`collins-phillips-week-${data.number}-newsletter.pdf`,content:Buffer.from(await pdf.save())};
}
