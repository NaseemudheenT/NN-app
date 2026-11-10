import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { APPLICATIONS, getApplication } from "@/lib/apps/registry";
import styles from "./page.module.css";

type PageProps = { params: Promise<{ appId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { appId } = await params;
  const app = getApplication(appId);
  return { title: app ? app.name : "Application" };
}

export default async function ApplicationOverviewPage({ params }: PageProps) {
  const { appId } = await params;
  const app = getApplication(appId);
  if (!app) notFound();
  if (app.availability === "available" && app.href) redirect(app.href);

  const related = APPLICATIONS.filter(
    (candidate) => candidate.group === app.group && candidate.id !== app.id,
  ).slice(0, 3);

  return (
    <main className={styles.root}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/home" aria-label="NN Home">
          <span className={styles.brandMark}>NN</span>
          <span>NN <i>/</i> PERSONAL OS</span>
        </Link>
        <span className={styles.privateState}><i /> PRIVATE ENVIRONMENT</span>
      </header>

      <div className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/home">NN HOME</Link><span>/</span>
          <span>{app.group.toUpperCase()}</span><span>/</span>
          <span aria-current="page">{app.name.toUpperCase()}</span>
        </nav>

        <section className={`${styles.hero} nn-surface-hero`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>NN APPLICATION · {app.group.toUpperCase()}</p>
            <div className={styles.titleRow}>
              <span className={`${styles.appIcon} nn-icon-well`}><Icon name={app.icon} size={29} /></span>
              <h1>{app.name}</h1>
            </div>
            <p className={styles.description}>{app.description}.</p>
            <div className={styles.statusLine}>
              <span className={styles.statusDot} />
              <strong>IN DEVELOPMENT</strong>
              <span>·</span>
              <span>NOT YET OPERATIONAL</span>
            </div>
          </div>
          <div className={styles.orb} aria-hidden="true">
            <span className={styles.orbRing} />
            <span className={styles.orbRingInner} />
            <span className={styles.orbCore}><Icon name={app.icon} size={34} /></span>
          </div>
        </section>

        <section className={`${styles.truthPanel} nn-callout nn-callout-warning`} aria-labelledby="status-title">
          <div className={styles.panelIcon}><Icon name="shield" size={20} /></div>
          <div>
            <p className={styles.panelEyebrow}>IMPLEMENTATION STATUS</p>
            <h2 id="status-title">This application is planned, not live.</h2>
            <p>This page is an honest product overview. It does not create or modify records, connect external accounts, run automations or claim that unfinished capabilities are working.</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="quality-title">
          <div className={styles.sectionHeading}>
            <p>RELEASE REQUIREMENTS</p>
            <h2 id="quality-title">What must be true before launch.</h2>
          </div>
          <div className={styles.gates}>
            <article className={`${styles.gate} nn-surface-glass`}>
              <span>01</span><div><h3>Complete interface</h3><p>Responsive screens, real controls, readable states and accessible interactions.</p></div>
            </article>
            <article className={styles.gate}>
              <span>02</span><div><h3>Real functionality</h3><p>Working data paths, clear loading and error handling, and no fabricated content.</p></div>
            </article>
            <article className={styles.gate}>
              <span>03</span><div><h3>Owner security and verification</h3><p>Founder-only permissions, tested workflows and reliable behaviour before release.</p></div>
            </article>
          </div>
        </section>

        {related.length > 0 ? (
          <section className={styles.section} aria-labelledby="related-title">
            <div className={styles.sectionHeading}>
              <p>CONNECTED APPLICATIONS</p>
              <h2 id="related-title">Part of {app.group}.</h2>
            </div>
            <div className={styles.related}>
              {related.map((item) => (
                <Link className={`${styles.relatedCard} nn-card-interactive nn-focus-ring`} href={item.overviewHref as Route} key={item.id}>
                  <span><Icon name={item.icon} size={19} /></span>
                  <strong>{item.name}</strong>
                  <small>{item.availability === "available" ? "AVAILABLE" : "IN DEVELOPMENT"}</small>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/home">Back to NN Home <span>↗</span></Link>
          <Link className={styles.secondaryAction} href="/life">Open NN Life <span>↗</span></Link>
        </div>
      </div>
      <footer className={styles.footer}><span>NN · PRIVATE PERSONAL OPERATING ENVIRONMENT</span><span>ONE OWNER · ONE PRIVATE ECOSYSTEM</span></footer>
    </main>
  );
}
