import type {Metadata} from "next";
import Connections from "./connections";
export const metadata:Metadata={title:"Agent Connections · Darth Algo",robots:{index:false,follow:false}};
export default function Page(){return <Connections/>;}
