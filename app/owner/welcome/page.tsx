import Link from 'next/link';
import WelcomePanel from '../welcome-panel';
import styles from '../welcome.module.css';
export const metadata={title:'Welcome Agent · Darth Algo',robots:{index:false,follow:false}};
export default function WelcomePage(){return <main className={styles.page}><Link className={styles.back} href='/owner'>← Command center</Link><WelcomePanel/></main>;}
