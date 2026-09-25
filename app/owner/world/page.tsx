import {cookies} from 'next/headers';
import Link from 'next/link';
import {ownerCookie,validOwnerSession} from '../../lib/business-os/owner-session';
import {SheetFocusProvider} from '../iphone-sheet';
import World from './world';
export const dynamic='force-dynamic';
export const metadata={title:'Darth Algo · HQ World',robots:{index:false,follow:false}};
export default async function WorldPage(){
 const authorized=process.env.AI_OS_ENABLED==='true'&&validOwnerSession((await cookies()).get(ownerCookie)?.value,process.env.AI_OS_OWNER_KEY);
 if(!authorized)return <main id='main-content' className='min-h-screen bg-black p-8 text-white'><h1 className='text-3xl font-bold'>Your private HQ World</h1><p className='my-5'>Open your private AI Command Center chat in Telegram and send /connect. Tap its button, then Connect this device. Each browser needs its own connection.</p><Link className='inline-flex min-h-11 items-center rounded-xl bg-red-600 px-5' href='/owner'>Open Dashboard</Link></main>;
 if(process.env.HQ_WORLD_ENABLED==='false')return <main id='main-content' className='p-8'><h1>HQ World is switched off</h1><p>Your existing dashboard and workers remain available.</p><Link href='/owner'>Open Dashboard</Link></main>;
 return <SheetFocusProvider><World/></SheetFocusProvider>;
}
