import type {Metadata} from 'next';
import CeoDesk from './ceo-desk';
import IphoneHome from './iphone-home';
import {SheetFocusProvider} from './iphone-sheet';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Darth Algo · Headquarters',robots:{index:false,follow:false},alternates:{canonical:null}};
export default function OwnerPage(){return <SheetFocusProvider><IphoneHome worldEnabled={process.env.HQ_WORLD_ENABLED!=='false'} workspace={<CeoDesk/>}/></SheetFocusProvider>;}
