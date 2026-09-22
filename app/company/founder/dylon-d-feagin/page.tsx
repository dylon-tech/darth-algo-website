import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ArrowUpRight, ArrowDown, BarChart3, Users, Layers, Compass, Target, Eye } from "lucide-react";
import styles from "./founder.module.css";

const origin = "https://www.darthalgo.com";
const profileUrl = `${origin}/company/founder/dylon-d-feagin`;
const portraitUrl = `${origin}/founder/dylon-d-feagin.jpg`;
const logoUrl = `${origin}/founder/darth-algo-color.jpg`;
const description = "Meet Dylon D. Feagin, Founder & CEO of Darth Algo. Building TradingView indicators with a focus on clear tools, thoughtful design, and a connected trading community.";

export const viewport: Viewport = { themeColor: "#f8f3eb", colorScheme: "light" };
export const metadata: Metadata = {
  title: { absolute: "Dylon D. Feagin | Founder & CEO of Darth Algo" },
  description,
  alternates: { canonical: profileUrl },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  openGraph: {
    title: "Dylon D. Feagin — Founder & CEO of Darth Algo",
    description, type: "profile", url: profileUrl, siteName: "Darth Algo",
    images: [{ url: portraitUrl, width: 1254, height: 1254, alt: "Dylon D. Feagin, Founder & CEO of Darth Algo" }],
  },
  twitter: { card: "summary", title: "Dylon D. Feagin | Darth Algo", description, images: [portraitUrl] },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "ProfilePage", "@id": `${profileUrl}#profile`, url: profileUrl,
      name: "Dylon D. Feagin — Founder & CEO of Darth Algo", description,
      mainEntity: { "@id": `${profileUrl}#person` },
      primaryImageOfPage: { "@id": `${profileUrl}#portrait` },
      isPartOf: { "@id": `${origin}/#website` } },
    { "@type": "Person", "@id": `${profileUrl}#person`, name: "Dylon D. Feagin",
      givenName: "Dylon", familyName: "Feagin", jobTitle: "Founder & CEO", url: profileUrl,
      description, image: { "@id": `${profileUrl}#portrait` },
      worksFor: { "@id": `${origin}/#organization` } },
    { "@type": "ImageObject", "@id": `${profileUrl}#portrait`, url: portraitUrl,
      contentUrl: portraitUrl, width: 1254, height: 1254,
      caption: "Dylon D. Feagin, Founder & CEO of Darth Algo" },
    { "@type": "Organization", "@id": `${origin}/#organization`, name: "Darth Algo",
      url: origin, founder: { "@id": `${profileUrl}#person` },
      logo: { "@type": "ImageObject", url: logoUrl, width: 1254, height: 1254 } },
  ],
};

const principles = [
  { icon: BarChart3, title: "Trader first", text: "Built around the chart." },
  { icon: Layers, title: "Builder always", text: "Focused on useful tools." },
  { icon: Users, title: "Community driven", text: "People behind the product." },
  { icon: Compass, title: "Long-term vision", text: "A business built to grow." },
];

export default function FounderPage() {
  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/about-darth-algo" className={styles.brand} aria-label="About Darth Algo">
            {/* The supplied official artwork in its original full colors. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/founder/darth-algo-color.jpg" alt="Darth Algo" width={1254} height={1254} className={styles.logo} />
            <span className={styles.brandLabel}>Darth Algo<span>Official founder profile</span></span>
          </Link>
          <nav className={styles.nav} aria-label="Founder page navigation">
            <a href="#story">My story</a>
            <a href="#company">The company</a>
            <Link href="/support">Contact</Link>
          </nav>
          <Link href="/start" className={styles.headerCta}>Explore Darth Algo <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        <section className={styles.hero} aria-labelledby="founder-name">
          <figure className={styles.portraitCard}>
            <div className={styles.photoFrame}>
              {/* The user's actual photograph: no AI portrait, filters, crop, or overlays. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/founder/dylon-d-feagin.jpg" alt="Dylon D. Feagin wearing a black suit and glasses" width={1254} height={1254} fetchPriority="high" loading="eager" decoding="async" className={styles.portrait} />
            </div>
            <figcaption className={styles.caption}>
              <span className={styles.captionRule} aria-hidden="true" />
              <h1 id="founder-name">Dylon D. Feagin</h1>
              <p>Founder &amp; CEO <span aria-hidden="true">·</span> Darth Algo</p>
            </figcaption>
          </figure>

          <div className={styles.intro}>
            <p className={styles.eyebrow}><span aria-hidden="true" />The person behind Darth Algo</p>
            <h2>Clearer tools.<br /><span>A bigger vision.</span></h2>
            <p className={styles.lead}>A trader. A builder. A founder focused on making trading software more useful.</p>
            <p className={styles.bio}>Dylon D. Feagin is the founder and CEO of Darth Algo, an independent brand creating indicators for TradingView. He leads the company&apos;s product direction, brand, and customer experience—with a focus on clarity, practical tools, and community.</p>
            <div className={styles.principles}>
              {principles.map(({ icon: Icon, title, text }) => (
                <div className={styles.principle} key={title}>
                  <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
                  <h3>{title}</h3><p>{text}</p>
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <a href="#company" className={styles.primaryButton}>Meet Darth Algo <ArrowUpRight size={18} aria-hidden="true" /></a>
              <a href="#story" className={styles.textButton}>Read my story <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section className={styles.focusStrip} aria-label="At a glance">
          <div><strong>TradingView</strong><span>The platform</span></div>
          <div><strong>Swing · Scalp · Pro</strong><span>The tool family</span></div>
          <div><strong>Clarity &amp; community</strong><span>The focus</span></div>
        </section>

        <section className={styles.values} aria-label="Mission and vision">
          <article className={styles.valueCard}>
            <Target size={35} strokeWidth={1.5} aria-hidden="true" />
            <div><h2>My mission</h2><p>Make chart tools easier to understand and use, while building a community where traders can learn, share, and stay connected.</p></div>
          </article>
          <article className={styles.valueCard}>
            <Eye size={35} strokeWidth={1.5} aria-hidden="true" />
            <div><h2>My vision</h2><p>Grow Darth Algo into an established software brand known for thoughtful design, useful products, and a customer experience that earns trust.</p></div>
          </article>
        </section>

        <section id="story" className={styles.story} aria-labelledby="story-title">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>The founder journey</p><h2 id="story-title">From the chart.<br className={styles.mobileBreak} /> To the company.</h2></div>
          <div className={styles.timeline}>
            <article><span className={styles.timelineDot} aria-hidden="true" /><p className={styles.step}>01 / Trading</p><h3>A practical perspective</h3><p>An interest in the markets and the tools traders use to understand them.</p></article>
            <article><span className={styles.timelineDot} aria-hidden="true" /><p className={styles.step}>02 / Building</p><h3>Turning ideas into tools</h3><p>Bringing signals, market context, and visual trade planning into one workflow.</p></article>
            <article><span className={styles.timelineDot} aria-hidden="true" /><p className={styles.step}>03 / Darth Algo</p><h3>Building the business</h3><p>Connecting product development, customer experience, and a trading community.</p></article>
            <article><span className={styles.timelineDot} aria-hidden="true" /><p className={styles.step}>04 / What&apos;s next</p><h3>Thinking long term</h3><p>The goal: keep improving the tools and the company around them.</p></article>
          </div>
        </section>

        <section id="company" className={styles.company} aria-labelledby="company-title">
          <div><p className={styles.eyebrow}>The company behind the work</p><h2 id="company-title">Darth Algo.</h2><p>TradingView indicators designed to bring buy and sell signals, trend context, alerts, and visual trade-planning levels into a clearer chart workflow.</p><div className={styles.companyLinks}><Link href="/about-darth-algo">About the company <ArrowUpRight size={16} aria-hidden="true" /></Link><Link href="/community">Meet the community <ArrowUpRight size={16} aria-hidden="true" /></Link></div></div>
          <div className={styles.companyMark} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/founder/darth-algo-color.jpg" alt="" width={1254} height={1254} loading="lazy" />
          </div>
        </section>
        <p className={styles.disclaimer}>Darth Algo is independent of TradingView. Its indicators are analytical tools, not a promise of trading results. Trading involves risk.</p>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/about-darth-algo" className={styles.footerBrand} aria-label="About Darth Algo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/founder/darth-algo-color.jpg" alt="Darth Algo" width={1254} height={1254} loading="lazy" />
            <span>Clear tools.<br />A thoughtful approach.</span>
          </Link>
          <div className={styles.footerLinks}><Link href="/links">Official links</Link><Link href="/support">Contact</Link><Link href="/privacy-policy">Privacy</Link></div>
        </div>
        <div className={styles.footerBottom}><span>© 2026 Darth Algo. All rights reserved.</span><span>Dylon D. Feagin · Official founder profile</span></div>
      </footer>
    </div>
  );
}
