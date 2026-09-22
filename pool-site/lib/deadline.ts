// Pool deadlines are entered in America/Chicago, independently of the viewer's zone.
export function deadlineUTC(local:string):number{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))return NaN;
 const base=Date.parse(local+'Z');if(!Number.isFinite(base))return NaN;
 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const guess=base+6*3600000;const parts=Object.fromEntries(fmt.formatToParts(new Date(guess)).map(p=>[p.type,p.value]));
 const shown=Date.parse(parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute+':'+parts.second+'Z');
 return guess+(base-shown);
}
export function isClosed(w:{locked:boolean;deadlineLocal:string},now=Date.now()){return w.locked||!Number.isFinite(deadlineUTC(w.deadlineLocal))||now>=deadlineUTC(w.deadlineLocal)}
export function deadlineLabel(local:string){const ms=deadlineUTC(local);return Number.isFinite(ms)?new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(ms):'Deadline not set'}
