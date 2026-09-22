import type {Metadata} from 'next';
import HistoryPage from './history-page';
export const metadata:Metadata={title:'Pool history · Collins Phillips Bowl',description:'Historical results for Bryan, Kevin, Mike, and Ed.'};
export default function Page(){return <HistoryPage/>}
