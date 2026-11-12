import type {Metadata} from 'next';
import CeoDesk from './ceo-desk';
import IphoneHome from './iphone-home';
import {SheetFocusProvider} from './iphone-sheet';
import FounderDashboard from './founder-dashboard';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Darth Algo · Owner Workspace',robots:{index:false,follow:false},alternates:{canonical:null}};
export default async function OwnerPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const query=await searchParams;const legacy=query.legacy==='1'||typeof query.view==='string';return legacy?<SheetFocusProvider><IphoneHome worldEnabled={process.env.HQ_WORLD_ENABLED!=='false'} workspace={<CeoDesk/>}/></SheetFocusProvider>:<FounderDashboard/>;}
