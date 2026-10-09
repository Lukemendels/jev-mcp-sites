import type { Metadata } from 'next';
export const metadata: Metadata={title:'Jev Decisions',description:'Private structured decisions through Jev and ChatGPT.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
