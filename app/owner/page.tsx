import type {Metadata} from 'next';
import CeoDesk from './ceo-desk';
import IphoneHome from './iphone-home';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Darth Algo · Headquarters',robots:{index:false,follow:false},alternates:{canonical:null}};
export default function OwnerPage(){return <IphoneHome workspace={<CeoDesk/>}/>;}
