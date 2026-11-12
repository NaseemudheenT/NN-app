"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import type { NNApplication } from "@/lib/apps/registry";
import styles from "./NNAppPreview.module.css";

export const PREVIEW_MODULES: Record<string, { title: string; detail: string }[]> = {
  soul: [{title:"Reflection",detail:"A private space for thoughtful writing and review."},{title:"Gratitude",detail:"Capture what matters without turning it into a score."},{title:"Purpose",detail:"Keep principles and long-term direction visible."},{title:"Practices",detail:"Design personal routines with deliberate intent."}],
  mind: [{title:"Focus",detail:"Plan distraction-aware sessions and priorities."},{title:"Journal",detail:"Private reflection with dates and context."},{title:"Resilience",detail:"Track practices that support steady progress."},{title:"Patterns",detail:"Review trends only when supported by real entries."}],
  body: [{title:"Training",detail:"Plan sessions, exercises and progression."},{title:"Nutrition",detail:"Organise meals and personal nutrition notes."},{title:"Sleep",detail:"Review sleep records and consistency."},{title:"Recovery",detail:"Keep recovery routines and observations together."}],
  contacts: [{title:"People",detail:"Keep important personal contact details organised."},{title:"Important dates",detail:"Remember birthdays and meaningful occasions."},{title:"Follow-ups",detail:"Record conversations and next steps."},{title:"Circles",detail:"Organise relationships using private categories."}],
  "nature-universe": [{title:"Discoveries",detail:"Collect verified discoveries and questions."},{title:"Topics",detail:"Explore astronomy, biology, physics and nature."},{title:"Observations",detail:"Save observations with dates and sources."},{title:"Reading list",detail:"Keep research and learning references together."}],
  "peace-mode": [{title:"Focus room",detail:"A quieter interface for a deliberate work session."},{title:"Sessions",detail:"Review sessions you choose to record."},{title:"Soundscape",detail:"A future home for approved ambient audio."},{title:"Preferences",detail:"Control visual calm, motion and session behaviour."}],
  college: [{title:"Subjects",detail:"Organise modules, units, notes and question banks."},{title:"Timetable",detail:"Plan classes, labs and examination dates."},{title:"Exams",detail:"Prepare revision plans and track results."},{title:"Study materials",detail:"Keep notes and references beside each subject."}],
  academy: [{title:"Learning paths",detail:"Build structured paths for technical skills."},{title:"Lessons",detail:"Organise concepts, explanations and resources."},{title:"Practice",detail:"Turn lessons into exercises and projects."},{title:"Progress",detail:"Measure completed work from recorded activity."}],
  "formula-engine": [{title:"Formula library",detail:"Store formulas with definitions and units."},{title:"Calculator",detail:"Design a verified calculation workspace."},{title:"Visualisation",detail:"Explore relationships with clear graphs."},{title:"History",detail:"Keep a traceable record of calculations."}],
  "logic-lab": [{title:"Challenges",detail:"Practise structured reasoning problems."},{title:"Aptitude",detail:"Organise timed and untimed practice."},{title:"Programming",detail:"Work through coding and algorithm exercises."},{title:"Review",detail:"Understand mistakes and repeat weak areas."}],
  "learning-vault": [{title:"Library",detail:"Organise books, courses and research."},{title:"Notes",detail:"Connect notes to their source material."},{title:"Flashcards",detail:"Build recall practice from your own content."},{title:"Research",detail:"Save references and evidence for later."}],
  finance: [{title:"Accounts",detail:"A private view of accounts and balances you enter or connect."},{title:"Budgets",detail:"Plan spending with clear categories."},{title:"Goals",detail:"Track savings targets and planned purchases."},{title:"Transactions",detail:"Review imported or manually recorded activity."}],
  invest: [{title:"Watchlist",detail:"Follow assets and research ideas."},{title:"Research",detail:"Keep investment theses and source notes."},{title:"Portfolio",detail:"Track holdings from verified connected data."},{title:"Risk review",detail:"Record allocation, exposure and decision notes."}],
  business: [{title:"Ventures",detail:"Keep business ideas, status and ownership clear."},{title:"Validation",detail:"Record customer evidence and experiments."},{title:"Operations",detail:"Organise recurring work and responsibilities."},{title:"Decisions",detail:"Document assumptions, options and outcomes."}],
  freelance: [{title:"Clients",detail:"Organise client relationships and context."},{title:"Proposals",detail:"Prepare scopes, pricing and terms."},{title:"Deliverables",detail:"Track work against agreed milestones."},{title:"Invoices",detail:"Record invoice status and payment evidence."}],
  career: [{title:"Skills",detail:"Map capabilities to evidence and practice."},{title:"Portfolio",detail:"Organise projects and verified work samples."},{title:"Interviews",detail:"Prepare questions and review feedback."},{title:"Roadmap",detail:"Plan the next career milestones."}],
  projects: [{title:"Projects",detail:"Keep project scope, status and ownership visible."},{title:"Milestones",detail:"Break outcomes into verifiable checkpoints."},{title:"Dependencies",detail:"Understand blockers and sequencing."},{title:"Reviews",detail:"Record progress and decisions."}],
  achievements: [{title:"Milestones",detail:"Capture meaningful completed outcomes."},{title:"Certificates",detail:"Store credentials and issuing details."},{title:"Evidence",detail:"Attach proof to each achievement."},{title:"Timeline",detail:"Review progress chronologically."}],
  "creator-studio": [{title:"Content",detail:"Plan creative work from idea to final asset."},{title:"Projects",detail:"Organise video, photo and design projects."},{title:"Assets",detail:"Keep source files and versions organised."},{title:"Publishing",detail:"Prepare drafts and approval checkpoints."}],
  studio: [{title:"Documents",detail:"Create and organise long-form work."},{title:"Drafts",detail:"Keep unfinished writing in one place."},{title:"Templates",detail:"Reuse approved document structures."},{title:"Publishing",detail:"Review final copy before external release."}],
  mail: [{title:"Inbox",detail:"A future connected view of your authorised mailboxes."},{title:"Drafts",detail:"Prepare messages for your review."},{title:"Follow-ups",detail:"Track conversations that need a response."},{title:"Accounts",detail:"Control connected mailbox permissions."}],
  english: [{title:"Speaking",detail:"Practise spoken English with structured prompts."},{title:"Listening",detail:"Build comprehension through guided exercises."},{title:"Vocabulary",detail:"Save words with meanings and examples."},{title:"Writing",detail:"Practise grammar, spelling and clear expression."}],
  files: [{title:"Library",detail:"A private index of your documents and media."},{title:"Folders",detail:"Organise files with a consistent structure."},{title:"Recent",detail:"Review recently accessed items."},{title:"Search",detail:"Find files by permitted metadata and content."}],
  memory: [{title:"Knowledge",detail:"Review information retained for future use."},{title:"Sources",detail:"Inspect where each fact came from."},{title:"Review",detail:"Correct stale or uncertain information."},{title:"Controls",detail:"Manage retention and access boundaries."}],
  "life-archive": [{title:"Timeline",detail:"A chronological view of recorded life events."},{title:"Milestones",detail:"Collect meaningful personal milestones."},{title:"Moments",detail:"Keep selected memories with context."},{title:"Search",detail:"Find events by date, topic and source."}],
  analytics: [{title:"Overview",detail:"A measured summary from connected records."},{title:"Trends",detail:"Explore patterns without inventing missing data."},{title:"Reports",detail:"Create summaries with clear date ranges."},{title:"Sources",detail:"Trace every metric to its underlying records."}],
  travel: [{title:"Trips",detail:"Organise destinations and travel dates."},{title:"Itineraries",detail:"Plan routes, activities and practical details."},{title:"Places",detail:"Save places with notes and source links."},{title:"Documents",detail:"Keep bookings and travel documents together."}],
  simulator: [{title:"Scenarios",detail:"Create safe what-if scenarios."},{title:"Variables",detail:"Adjust assumptions transparently."},{title:"Runs",detail:"Compare reproducible simulation runs."},{title:"Results",detail:"Inspect outputs, limits and uncertainty."}],
  "command-centre": [{title:"Ask",detail:"A natural-language entry point to authorised NN capabilities."},{title:"Actions",detail:"Review actions NN can actually perform."},{title:"Approvals",detail:"Confirm consequential actions explicitly."},{title:"History",detail:"Inspect requests and verified outcomes."}],
  search: [{title:"Search",detail:"Search only data you are authorised to access."},{title:"Filters",detail:"Narrow results by source, type and date."},{title:"Results",detail:"Open records with clear provenance."},{title:"Saved",detail:"Keep useful searches for later."}],
  "automation-studio": [{title:"Workflows",detail:"Design automations with explicit boundaries."},{title:"Triggers",detail:"Choose verified events and schedules."},{title:"Approvals",detail:"Require confirmation for consequential steps."},{title:"Run history",detail:"Inspect execution, failures and audit details."}],
  "security-centre": [{title:"Passkeys",detail:"Review registered sign-in credentials."},{title:"Devices",detail:"Inspect recognised devices and sessions."},{title:"Sessions",detail:"Review and revoke active sessions."},{title:"Audit",detail:"Trace security-sensitive events."}],
  "control-room": [{title:"System health",detail:"Show measured service status and last checks."},{title:"Integrations",detail:"Inspect connected providers and permissions."},{title:"Jobs",detail:"Review scheduled and background work."},{title:"Costs",detail:"Show actual usage and billing data only."}],
};

export function NNAppPreview({ app }: { app: NNApplication; related?: NNApplication[] }) {
  const modules = useMemo(() => PREVIEW_MODULES[app.id] ?? [], [app.id]);
  const [activeModule, setActiveModule] = useState(0);
  const selectedModule = modules[activeModule] ?? modules[0];

  return (
    <main className={styles.root}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/home" aria-label="Return to NN launcher">
          <NNLogo size={27} decorative />
          <span>NN</span>
        </Link>
        <div className={styles.topbarRight}>
          <span className={styles.privateState}><i /> PRIVATE</span>
          <Link className={styles.backLink} href="/home">All features</Link>
        </div>
      </header>

      <div className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/home">NN</Link><span>/</span><span>{app.group}</span><span>/</span><span aria-current="page">{app.name}</span>
        </nav>

        <section className={styles.workspaceHeader}>
          <div className={styles.titleBlock}>
            <span className={styles.appIcon}><Icon name={app.icon} size={22} /></span>
            <div>
              <p className={styles.eyebrow}>{app.group}</p>
              <h1>{app.name}</h1>
              <p className={styles.description}>{app.description}</p>
            </div>
          </div>
          <span className={styles.availability}><i /> IN DEVELOPMENT</span>
        </section>

        <div className={styles.workspaceLayout}>
          <nav className={styles.moduleNav} aria-label={`${app.name} workspace sections`}>
            <p className={styles.navLabel}>WORKSPACE</p>
            {modules.map((module, index) => (
              <button
                key={module.title}
                type="button"
                className={activeModule === index ? styles.moduleActive : styles.moduleButton}
                aria-current={activeModule === index ? "page" : undefined}
                onClick={() => setActiveModule(index)}
              >
                <span className={styles.moduleIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span>{module.title}</span>
                <Icon name="chevron-right" size={15} />
              </button>
            ))}
          </nav>

          <section className={styles.moduleSurface} aria-live="polite" aria-labelledby="module-title">
            {selectedModule ? (
              <>
                <div className={styles.moduleHeader}>
                  <div>
                    <p className={styles.eyebrow}>{app.name.toUpperCase()} / MODULE {String(activeModule + 1).padStart(2, "0")}</p>
                    <h2 id="module-title">{selectedModule.title}</h2>
                    <p>{selectedModule.detail}</p>
                  </div>
                  <span className={styles.moduleIcon}><Icon name={app.icon} size={20} /></span>
                </div>
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}><Icon name="layers" size={23} /></span>
                  <p className={styles.emptyEyebrow}>WORKSPACE NOT YET CONNECTED</p>
                  <h3>This module is being built.</h3>
                  <p>The interface structure is defined. Live records, create and edit actions, and connected services will appear here only after their implementation and verification.</p>
                  <span className={styles.dataBoundary}><Icon name="shield" size={14} /> No sample data · No simulated actions · No external connection</span>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <h3>Workspace definition required.</h3>
                <p>This application does not yet have a verified module map.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
