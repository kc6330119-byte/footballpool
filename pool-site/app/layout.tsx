import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"Collins Phillips Bowl · 2026–2027",description:"Weekly picks, results, standings and earnings for the Collins Phillips football pool.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}