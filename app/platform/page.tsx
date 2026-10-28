import type { Metadata } from 'next';
import Platform from './platform';
export const metadata:Metadata={title:'Platform preview',description:'Darth Algo market workspace, free Academy and paper journal. Development preview.',robots:{index:false,follow:false},alternates:{canonical:'/platform'}};
export default function Page(){return <Platform/>;}
