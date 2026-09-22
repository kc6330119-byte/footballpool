import PoolApp from './pool-app';
import seed from '@/lib/seed.json';
import type {Pool} from '@/lib/pool';
export default function Home(){return <PoolApp initial={seed as Pool}/>}