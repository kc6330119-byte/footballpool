'use client';
import {useEffect,useRef} from 'react';

export default function HeroVideo({paused}:{paused:boolean}){
 const ref=useRef<HTMLVideoElement>(null);
 useEffect(()=>{
  const video=ref.current!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false,disposed=false;
  function sync(){
   if(disposed)return;
   if(reduced.matches){
    video.pause();
    // Removing the source restores the poster and avoids downloading motion media.
    if(video.hasAttribute('src')){video.removeAttribute('src');video.load()}
    return;
   }
   if(paused||!visible||document.hidden){video.pause();return}
   if(!video.hasAttribute('src'))video.src='/media/football-hero.mp4';
   video.play().then(()=>{if(disposed||paused||!visible||document.hidden||reduced.matches)video.pause()}).catch(()=>{/* Keep the poster if autoplay is unavailable. */});
  }
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()},{threshold:.05});
  observer.observe(video);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  return()=>{disposed=true;video.pause();observer.disconnect();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync)};
 },[paused]);
 return <video ref={ref} className="stadium-video" poster="/media/football-hero-poster.jpg" muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1}/>;
}
