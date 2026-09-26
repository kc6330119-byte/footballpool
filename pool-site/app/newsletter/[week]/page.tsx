import {notFound} from 'next/navigation';
import {readPool} from '@/lib/storage';
import {weeklyReport} from '@/lib/weekly-report';
import {revealed} from '@/lib/submissions';
import {publicOrigin} from '@/lib/origin';
import styles from './newsletter.module.css';

export const dynamic='force-dynamic';
export const metadata={title:'The Final Whistle | Collins Phillips Football Pool',robots:{index:false,follow:false}};
export default async function Newsletter({params}:{params:Promise<{week:string}>}){
 const {week:slug}=await params;
 if(!/^(?:[1-9]|1[0-8])$/.test(slug))notFound();
 const {pool}=await readPool();
 const week=pool.weeks.find(w=>w.number===Number(slug));
 if(!week?.games.length||!revealed(week))notFound();
 const d=weeklyReport(pool,week.number,publicOrigin()).document;
 return <main className={styles.page}><article className={styles.paper}>
 <header className={styles.masthead}><p>COLLINS PHILLIPS FOOTBALL POOL · EST. 2023</p><h1>The Final Whistle</h1><p>{d.season} / WEEK {d.number} / {d.complete?'WEEKLY RESULTS':'RESULTS IN PROGRESS'}</p></header>
 <div className={styles.content}><p className={styles.live}>Latest saved results · This page updates as results change.</p>
 <section><p className={styles.eyebrow}>{d.winnerLabel}</p><h2 className={styles.headline}>{d.headline}</h2><p>{d.intro}</p><p><strong>Weekly winner: {d.winnerText}</strong></p>{d.note&&<blockquote><strong>Commissioner’s note:</strong> {d.note}</blockquote>}</section>
 <figure className={styles.photo}>{/* Bundled photographs retain their natural aspect ratio. */}<img src={`/newsletter/${d.photo}`} alt="Vintage black-and-white football action photograph supplied by the pool administrator"/><figcaption>FROM THE FOOTBALL SCRAPBOOK</figcaption></figure>
 <section><h2>The weekly scoreboard</h2><div className={styles.cards}>{d.weekly.map(r=><div className={styles.card} key={r[0]}><h3>{r[0]}</h3><dl><div><dt>Correct picks</dt><dd>{r[1]}</dd></div><div><dt>Total-points pick</dt><dd>{r[2]}</dd></div><div><dt>Distance</dt><dd>{r[3]}</dd></div></dl></div>)}</div><p className={styles.small}>Tiebreaker: {d.tiebreaker}</p></section>
 <section><h2>The season chase</h2><p>{d.seasonIntro}</p><div className={styles.cards}>{d.standings.map(r=><div className={styles.card} key={r[0]}><h3>{r[0]}</h3><dl><div><dt>Correct picks</dt><dd>{r[1]}</dd></div><div><dt>Weekly wins</dt><dd>{r[2]}</dd></div><div><dt>Earnings</dt><dd>{r[3]}</dd></div></dl></div>)}</div></section>
 <section><h2>Under the lights</h2><ul>{d.notes.map(n=><li key={n}>{n}</li>)}</ul></section>
 <section><h2>Every game. Every call.</h2>{d.games.map((g,i)=><div className={styles.game} key={i}><p className={styles.eyebrow}>GAME {String(i+1).padStart(2,'0')}</p><h3>{g.matchup}</h3><p>{g.result}</p><p className={styles.small}>{g.picks}</p></div>)}</section>
 <footer><a className={styles.link} href={d.link}>Back to weekly picks →</a><p className={styles.small}>COLLINS PHILLIPS FOOTBALL POOL · EST. 2023</p></footer>
 </div></article></main>;
}
