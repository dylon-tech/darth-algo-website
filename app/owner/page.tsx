import type { Metadata } from "next";
import CeoDesk from "./ceo-desk";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Darth Algo · CEO Command Center",robots:{index:false,follow:false},alternates:{canonical:null}};
export default function OwnerPage(){return <CeoDesk/>;}
