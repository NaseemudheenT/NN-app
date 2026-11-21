"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { NNApplication } from "@/lib/apps/registry";
import styles from "./NNDomainBlueprint.module.css";

export type DomainLayout = "dashboard" | "navigator" | "library" | "planner" | "roadmap" | "reader" | "analytics";

export interface DomainModule {
  id: string;
  layout?: DomainLayout;
  title: string;
  description: string;
  icon: IconName;
  regions: readonly string[];
}

export const DOMAIN_BLUEPRINTS: Readonly<Record<string, readonly DomainModule[]>> = {
  soul: [
    { id: "reflections", title: "Reflection space", description: "A private writing environment for thoughts, values and personal reflection.", icon: "file", regions: ["Writing canvas", "Date and context", "Private archive"] },
    { id: "gratitude", title: "Gratitude journal", description: "A quiet way to capture what matters without turning gratitude into a score.", icon: "sparkle", regions: ["Daily entry", "Past entries", "Search and revisit"] },
    { id: "principles", title: "Principles library", description: "Keep chosen principles visible and connected to real decisions.", icon: "book", regions: ["Principle cards", "Personal notes", "Review view"] },
  ],
  mind: [
    { id: "focus", title: "Focus workspace", description: "A distraction-light place for deliberate work and reflection.", icon: "clock", regions: ["Session intention", "Focus timer", "Recorded sessions"] },
    { id: "journal", title: "Mind journal", description: "A structured journal with private entries and source-aware context.", icon: "file", regions: ["Entry editor", "Mood/context fields", "Entry history"] },
    { id: "growth", title: "Growth map", description: "Organise personal learning goals and the steps you choose to take.", icon: "compass", regions: ["Growth areas", "Chosen practices", "Review notes"] },
  ],
  body: [
    { id: "training", title: "Training log", description: "Plan and review training sessions without invented performance data.", icon: "pulse", regions: ["Session planner", "Exercise details", "Training history"] },
    { id: "nutrition", title: "Nutrition journal", description: "Record meals and observations with a clear source for each entry.", icon: "file", regions: ["Meal capture", "Daily journal", "Food notes"] },
    { id: "recovery", title: "Recovery view", description: "Bring sleep and recovery records into one readable personal view.", icon: "moon", regions: ["Sleep records", "Recovery notes", "Trend view when data exists"] },
  ],
  contacts: [
    { id: "people", title: "People directory", description: "A private relationship directory with useful context and follow-up history.", icon: "people", regions: ["Contact profile", "Relationship notes", "Linked dates"] },
    { id: "dates", title: "Important dates", description: "Keep birthdays and meaningful occasions in a dedicated calendar view.", icon: "calendar", regions: ["Date timeline", "Person links", "Reminder settings"] },
    { id: "followups", title: "Follow-up board", description: "Track conversations that need a next step.", icon: "check", regions: ["Open follow-ups", "Due-date view", "Completed history"] },
  ],
  "nature-universe": [
    { id: "observations", title: "Observation log", description: "Capture discoveries with time, place and source context.", icon: "globe", regions: ["Observation capture", "Location and date", "Source references"] },
    { id: "questions", title: "Question explorer", description: "Keep open questions and connect them to answers you verify.", icon: "search", regions: ["Open questions", "Research notes", "Verified answers"] },
    { id: "fieldnotes", title: "Field notes", description: "A calm notebook for nature, science and astronomy discoveries.", icon: "book", regions: ["Notebook", "Media references", "Linked observations"] },
  ],
  "peace-mode": [
    { id: "quiet", title: "Quiet session", description: "A minimal environment for intentional quiet time.", icon: "moon", regions: ["Session intention", "Quiet timer", "Private reflection"] },
    { id: "environment", title: "Focus environment", description: "A reduced-stimulation view with only the controls you choose.", icon: "sliders", regions: ["Appearance controls", "Distraction preferences", "Session state"] },
    { id: "reflection", title: "Reflection space", description: "Capture a short reflection after a quiet session.", icon: "file", regions: ["Reflection editor", "Session links", "Private history"] },
  ],
  college: [
    { id: "semester", layout: "dashboard", title: "Semester overview", description: "A clear academic home for subjects, exams and the work ahead.", icon: "calendar", regions: ["Semester selector", "Subject cards", "Upcoming academic dates"] },
    { id: "syllabus", layout: "navigator", title: "Subjects and syllabus", description: "Move from a subject into units, topics and source material.", icon: "book", regions: ["Subject overview", "Unit navigator", "Topic notes"] },
    { id: "question-bank", layout: "library", title: "Question bank", description: "Browse questions by subject, unit, marks and source.", icon: "search", regions: ["Question filters", "Question reader", "Answer workspace"] },
    { id: "exam-prep", layout: "planner", title: "Exam preparation", description: "Organise assignments, timetable, attendance, marks and revision.", icon: "graph", regions: ["Assignment board", "Exam timetable", "Attendance and marks"] },
  ],
  academy: [
    { id: "paths", layout: "roadmap", title: "Learning paths", description: "Build structured technical and professional learning journeys.", icon: "compass", regions: ["Path overview", "Milestone map", "Prerequisite links"] },
    { id: "courses", layout: "library", title: "Course library", description: "Keep courses and learning resources organised by skill.", icon: "book", regions: ["Course catalogue", "Course detail", "Resource list"] },
    { id: "lesson", layout: "reader", title: "Lesson workspace", description: "Read, practise and save lesson notes in one focused surface.", icon: "file", regions: ["Lesson reader", "Practice area", "Saved notes"] },
    { id: "mastery", layout: "analytics", title: "Mastery review", description: "Review actual practice and identify what needs another pass.", icon: "graph", regions: ["Practice history", "Revision queue", "Skill review"] },
  ],
  "formula-engine": [
    { id: "library", title: "Formula library", description: "A searchable reference with units, definitions and source notes.", icon: "formula", regions: ["Formula index", "Formula detail", "Source reference"] },
    { id: "workspace", title: "Calculation workspace", description: "A structured space for inputs, steps and checked results.", icon: "circuit", regions: ["Input fields", "Step-by-step derivation", "Result and units"] },
    { id: "converter", title: "Unit converter", description: "Convert compatible units with explicit conversion assumptions.", icon: "sliders", regions: ["Quantity input", "Unit selectors", "Conversion explanation"] },
  ],
  "logic-lab": [
    { id: "challenges", title: "Challenge arena", description: "Work through reasoning and programming challenges.", icon: "circuit", regions: ["Challenge list", "Problem statement", "Answer workspace"] },
    { id: "aptitude", title: "Aptitude practice", description: "Organise timed and untimed practice by topic.", icon: "clock", regions: ["Topic selector", "Practice session", "Answer review"] },
    { id: "review", title: "Solution review", description: "Compare attempts with verified explanations and source material.", icon: "search", regions: ["Attempt history", "Explanation panel", "Mistake notes"] },
  ],
  "learning-vault": [
    { id: "library", title: "Learning library", description: "A central catalogue for books, courses and learning resources.", icon: "book", regions: ["Library grid", "Resource detail", "Reading status"] },
    { id: "sources", title: "Source reader", description: "Keep source documents and notes connected.", icon: "file", regions: ["Document reader", "Highlights and notes", "Citation details"] },
    { id: "recall", title: "Recall workspace", description: "A place for flashcards, spaced review and connected knowledge.", icon: "archive", regions: ["Flashcard deck", "Review session", "Knowledge links"] },
  ],
  finance: [
    { id: "overview", title: "Financial overview", description: "A high-contrast overview built only from connected, verified records.", icon: "wallet", regions: ["Account summary", "Cash-flow view", "Data freshness and source"] },
    { id: "transactions", title: "Transactions", description: "Review and categorise recorded income and expenses.", icon: "layers", regions: ["Transaction list", "Category filters", "Transaction detail"] },
    { id: "budgets", title: "Budgets and goals", description: "Organise planned spending and financial targets.", icon: "graph", regions: ["Budget categories", "Goal progress", "Period review"] },
    { id: "reports", title: "Reports", description: "Understand financial patterns with visible provenance.", icon: "file", regions: ["Period selector", "Cash-flow breakdown", "Exportable report"] },
  ],
  invest: [
    { id: "watchlists", title: "Watchlists", description: "Follow selected assets with clear exchange and currency context.", icon: "trend", regions: ["Watchlist groups", "Asset detail", "Quote timestamp"] },
    { id: "research", title: "Research desk", description: "Compare company fundamentals and keep source-backed research.", icon: "search", regions: ["Research notes", "Fundamental data", "Source links"] },
    { id: "portfolio", title: "Portfolio view", description: "Track holdings only when actual portfolio records or a provider are connected.", icon: "wallet", regions: ["Holdings table", "Allocation view", "Valuation timestamp"] },
    { id: "performance", title: "Performance analysis", description: "Review performance with fees, currency and date assumptions visible.", icon: "graph", regions: ["Period comparison", "Return methodology", "Risk notes"] },
  ],
  business: [
    { id: "ventures", title: "Venture workspace", description: "Keep business ideas, ventures and operating context together.", icon: "briefcase", regions: ["Venture overview", "Business model", "Key documents"] },
    { id: "validation", title: "Validation board", description: "Organise assumptions, experiments and evidence.", icon: "check", regions: ["Assumption list", "Experiment cards", "Evidence review"] },
    { id: "operations", title: "Operations desk", description: "Map recurring work, responsibilities and process documentation.", icon: "layers", regions: ["Process map", "Operating checklist", "Decision log"] },
    { id: "decisions", title: "Decision journal", description: "Record decisions with context and the evidence available at the time.", icon: "file", regions: ["Decision statement", "Evidence and alternatives", "Outcome review"] },
  ],
  freelance: [
    { id: "clients", title: "Client directory", description: "Keep client context, conversations and active work in one place.", icon: "people", regions: ["Client profiles", "Project links", "Communication history"] },
    { id: "proposals", title: "Proposal studio", description: "Prepare scoped proposals with clear deliverables and assumptions.", icon: "file", regions: ["Proposal editor", "Scope and pricing", "Approval state"] },
    { id: "delivery", title: "Delivery board", description: "Track deliverables, invoices and the work awaiting review.", icon: "check", regions: ["Project milestones", "Deliverable review", "Invoice status"] },
  ],
  career: [
    { id: "skills", title: "Skill map", description: "Organise skills, evidence and the next learning milestone.", icon: "compass", regions: ["Skill categories", "Evidence links", "Learning priorities"] },
    { id: "portfolio", title: "Portfolio", description: "Present verified projects, work samples and achievements.", icon: "layers", regions: ["Project gallery", "Case-study detail", "Evidence links"] },
    { id: "interviews", title: "Interview preparation", description: "Prepare technical topics, practice and interview reflections.", icon: "mic", regions: ["Preparation plan", "Practice prompts", "Review notes"] },
  ],
  projects: [
    { id: "boards", title: "Project boards", description: "A visual space for milestones, work items and delivery.", icon: "layers", regions: ["Board view", "Task detail", "Filters and grouping"] },
    { id: "timeline", title: "Timeline", description: "Understand dependencies and sequencing across a project.", icon: "calendar", regions: ["Milestone timeline", "Dependency map", "Schedule detail"] },
    { id: "retrospective", title: "Retrospectives", description: "Capture delivery lessons and decisions for the next cycle.", icon: "file", regions: ["Review prompts", "Lessons learned", "Next actions"] },
  ],
  achievements: [
    { id: "milestones", title: "Milestones", description: "Keep a record of meaningful milestones and their dates.", icon: "trophy", regions: ["Milestone timeline", "Achievement detail", "Related projects"] },
    { id: "certificates", title: "Certificates", description: "Organise certificates and the evidence behind each claim.", icon: "archive", regions: ["Certificate library", "Issuer and date", "Verification link"] },
    { id: "evidence", title: "Evidence vault", description: "Connect claims to files, links and source records.", icon: "folder", regions: ["Evidence collection", "Source details", "Share-ready view"] },
  ],
  "creator-studio": [
    { id: "calendar", title: "Content calendar", description: "Plan content with clear draft, review and publish states.", icon: "calendar", regions: ["Calendar view", "Content card", "Channel selector"] },
    { id: "media", title: "Media library", description: "Organise source media and creative assets.", icon: "camera", regions: ["Asset grid", "Asset detail", "Usage rights and source"] },
    { id: "production", title: "Production board", description: "Move creative work through a deliberate production pipeline.", icon: "layers", regions: ["Production stages", "Creative brief", "Review checklist"] },
  ],
  studio: [
    { id: "documents", title: "Document workspace", description: "Write and organise documents with a clear editing hierarchy.", icon: "file", regions: ["Document list", "Editor canvas", "Document metadata"] },
    { id: "templates", title: "Templates", description: "Start from reusable structures without locking the writing.", icon: "layers", regions: ["Template library", "Template preview", "New document flow"] },
    { id: "publishing", title: "Publishing desk", description: "Prepare drafts and review publication details before approval.", icon: "check", regions: ["Draft queue", "Preview", "Approval checkpoint"] },
  ],
  mail: [
    { id: "inbox", title: "Inbox", description: "A calm message list with clear unread and priority states.", icon: "mail", regions: ["Mailbox list", "Message preview", "Search and filters"] },
    { id: "compose", title: "Compose", description: "Prepare messages with recipient checks and a clear send approval step.", icon: "pen", regions: ["Recipient fields", "Message editor", "Send confirmation"] },
    { id: "followups", title: "Follow-ups", description: "Keep unanswered conversations visible without sending automatically.", icon: "clock", regions: ["Follow-up queue", "Conversation context", "Reminder settings"] },
  ],
  english: [
    { id: "plan", title: "Practice plan", description: "A structured path for speaking, listening, grammar and writing.", icon: "calendar", regions: ["Weekly plan", "Daily practice", "Progress review"] },
    { id: "listening", title: "Listening lab", description: "Practise with source audio, transcripts and comprehension checks.", icon: "mic", regions: ["Audio player", "Transcript", "Comprehension questions"] },
    { id: "speaking", title: "Speaking studio", description: "A private practice space for pronunciation and spoken responses.", icon: "language", regions: ["Speaking prompt", "Recording control", "Pronunciation feedback"] },
    { id: "writing", title: "Writing and grammar", description: "Work through grammar, vocabulary and writing corrections.", icon: "pen", regions: ["Exercise editor", "Correction view", "Vocabulary notebook"] },
  ],
  memory: [
    { id: "capture", title: "Knowledge capture", description: "Save useful knowledge with its original source and context.", icon: "archive", regions: ["Capture form", "Source metadata", "Saved knowledge"] },
    { id: "connections", title: "Knowledge connections", description: "Explore links between saved facts, projects and decisions.", icon: "flow", regions: ["Connection graph", "Related records", "Provenance panel"] },
    { id: "review", title: "Review queue", description: "Revisit saved information and correct outdated context.", icon: "check", regions: ["Review queue", "Source comparison", "Correction history"] },
  ],
  "life-archive": [
    { id: "timeline", title: "Life timeline", description: "Browse dated records and milestones from your own archive.", icon: "clock", regions: ["Timeline", "Date filters", "Record detail"] },
    { id: "collections", title: "Collections", description: "Group important memories, files and milestones.", icon: "folder", regions: ["Collection grid", "Collection detail", "Linked items"] },
    { id: "search", title: "Archive search", description: "Find archived items by date, source and linked context.", icon: "search", regions: ["Search field", "Result list", "Provenance detail"] },
  ],
  analytics: [
    { id: "overview", title: "Overview", description: "A clear view of available records, with no invented metrics.", icon: "graph", regions: ["Metric definitions", "Source coverage", "Last updated"] },
    { id: "trends", title: "Trends", description: "Explore change over time only where sufficient source data exists.", icon: "trend", regions: ["Time range", "Trend chart", "Data quality note"] },
    { id: "reports", title: "Reports", description: "Build reports with filters and visible calculation methods.", icon: "file", regions: ["Report builder", "Filters", "Export preview"] },
  ],
  travel: [
    { id: "trips", title: "Trip workspace", description: "Organise trip details, dates and related documents.", icon: "plane", regions: ["Trip overview", "Itinerary", "Travel documents"] },
    { id: "places", title: "Places", description: "Save places and map them to a planned journey.", icon: "globe", regions: ["Saved places", "Map view", "Place detail"] },
    { id: "planning", title: "Travel planning", description: "Bring bookings, transport and budgets into one itinerary.", icon: "calendar", regions: ["Day-by-day plan", "Booking references", "Budget overview"] },
  ],
  simulator: [
    { id: "scenarios", title: "Scenario builder", description: "Define assumptions and inputs before running a model.", icon: "sliders", regions: ["Scenario setup", "Input controls", "Assumption notes"] },
    { id: "model", title: "Model workspace", description: "Inspect the model and calculation steps behind a result.", icon: "formula", regions: ["Model definition", "Calculation trace", "Validation checks"] },
    { id: "results", title: "Results", description: "Compare generated scenarios with limitations and assumptions visible.", icon: "graph", regions: ["Result comparison", "Sensitivity view", "Export and notes"] },
  ],
  "command-centre": [
    { id: "overview", title: "System overview", description: "A factual view of connected services and their verified state.", icon: "grid", regions: ["Service inventory", "Current state", "Last verification"] },
    { id: "activity", title: "Activity log", description: "Review system events with timestamps and source information.", icon: "clock", regions: ["Event stream", "Event detail", "Filters"] },
    { id: "integrations", title: "Integrations", description: "Inspect connected providers, permissions and configuration.", icon: "flow", regions: ["Provider list", "Permission detail", "Connection test"] },
  ],
  "automation-studio": [
    { id: "workflows", title: "Workflow canvas", description: "Design trigger and action sequences with approval checkpoints.", icon: "flow", regions: ["Workflow canvas", "Trigger configuration", "Action sequence"] },
    { id: "approvals", title: "Approval queue", description: "Review consequential actions before any execution.", icon: "shield", regions: ["Pending approvals", "Action summary", "Audit record"] },
    { id: "runs", title: "Run history", description: "Inspect actual workflow executions and failure reasons.", icon: "clock", regions: ["Execution history", "Run detail", "Retry eligibility"] },
  ],
  "security-centre": [
    { id: "access", title: "Access and sign-in", description: "Review authentication methods and access controls.", icon: "shield", regions: ["Sign-in methods", "Owner claim status", "Access history"] },
    { id: "sessions", title: "Sessions and devices", description: "Inspect sessions and registered devices from verified records.", icon: "cube", regions: ["Active sessions", "Device list", "Revoke confirmation"] },
    { id: "audit", title: "Security audit", description: "Review security events with source and timestamp context.", icon: "file", regions: ["Audit timeline", "Event detail", "Exportable evidence"] },
  ],
  "control-room": [
    { id: "environment", title: "Environment", description: "Understand the current interface environment and available capabilities.", icon: "sliders", regions: ["Appearance", "Motion preferences", "Display density"] },
    { id: "preferences", title: "Preferences", description: "Set personal defaults for the way NN behaves and appears.", icon: "settings", regions: ["Preference groups", "Per-app defaults", "Reset controls"] },
    { id: "data", title: "Data controls", description: "Review export, retention and privacy controls before changing them.", icon: "archive", regions: ["Data inventory", "Export options", "Destructive-action approval"] },
  ],
};

function EducationCanvas({ app, module }: { app: NNApplication; module: DomainModule }) {
  const regions = module.regions;
  const isCollege = app.id === "college";
  const kind = module.layout ?? "dashboard";
  return (
    <div className={styles.educationCanvas} data-layout={kind} aria-label="Education interface wireframe. No real academic records are shown.">
      {kind === "dashboard" ? (
        <>
          <div className={styles.educationWelcome}><span>{app.name.toUpperCase()} / OVERVIEW</span><strong>{module.title}</strong><small>Semester context and academic workspace</small></div>
          <div className={styles.educationDashboard}>
            {regions.map((region, index) => <div className={styles.educationTile} key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong><i/><i/></div>)}
          </div>
        </>
      ) : null}
      {kind === "navigator" ? (
        <div className={styles.educationSplit}>
          <aside className={styles.educationTree}><span>SUBJECT STRUCTURE</span>{regions.map((region,index)=><div key={region} data-active={index===0}><i/>{region}</div>)}</aside>
          <div className={styles.educationReader}><span>SELECTED TOPIC</span><strong>{regions[2] ?? module.title}</strong><div className={styles.wireParagraph}><i/><i/><i/><i/></div><div className={styles.wireCallout}/><span className={styles.wireButton}>OPEN STUDY NOTES</span></div>
        </div>
      ) : null}
      {kind === "library" ? (
        <div className={styles.educationSplit}>
          <aside className={styles.educationTree}><span>{isCollege ? "QUESTION FILTERS" : "COURSE FILTERS"}</span>{regions.slice(0,2).map((region,index)=><div key={region} data-active={index===0}><i/>{region}</div>)}</aside>
          <div className={styles.educationList}><span>{isCollege ? "QUESTION COLLECTION" : "COURSE LIBRARY"}</span>{regions.map((region,index)=><div className={styles.educationListRow} key={region}><span>{String(index+1).padStart(2,"0")}</span><strong>{region}</strong><i/></div>)}</div>
        </div>
      ) : null}
      {kind === "planner" ? (
        <div className={styles.educationPlanner}><span>ACADEMIC TIMELINE</span>{regions.map((region,index)=><div className={styles.timelineRow} key={region}><span>{String(index+1).padStart(2,"0")}</span><i/><strong>{region}</strong><small>PLANNING AREA</small></div>)}</div>
      ) : null}
      {kind === "roadmap" ? (
        <div className={styles.educationRoadmap}><span>LEARNING PATH</span><div className={styles.pathNodes}>{regions.map((region,index)=><div key={region} data-step={index===0?"active":"future"}><i>{String(index+1).padStart(2,"0")}</i><strong>{region}</strong></div>)}</div></div>
      ) : null}
      {kind === "reader" ? (
        <div className={styles.educationSplit}>
          <div className={styles.educationReader}><span>LESSON CONTENT</span><strong>{module.title}</strong><div className={styles.wireParagraph}><i/><i/><i/><i/><i/></div><div className={styles.wireCallout}/><div className={styles.wireParagraph}><i/><i/><i/></div></div>
          <aside className={styles.educationTree}><span>STUDY PANEL</span>{regions.slice(1).map((region)=><div key={region}><i/>{region}</div>)}</aside>
        </div>
      ) : null}
      {kind === "analytics" ? (
        <div className={styles.educationAnalytics}><span>MASTERY REVIEW · VISUAL STRUCTURE ONLY</span><div className={styles.masteryBars}>{regions.map((region,index)=><div key={region}><i style={{height:`${30 + index * 15}%`}}/><strong>{region}</strong></div>)}</div></div>
      ) : null}
      <div className={styles.educationFootnote}>DESIGN PREVIEW · CONNECT TO VERIFIED ACADEMIC RECORDS IN CLAUDE PHASE</div>
    </div>
  );
}

export function NNDomainBlueprint({ app }: { app: NNApplication }) {
  const modules = DOMAIN_BLUEPRINTS[app.id];
  const [selectedId, setSelectedId] = useState(modules?.[0]?.id ?? "");
  if (!modules?.length) return null;
  const selected = modules.find((module) => module.id === selectedId) ?? modules[0]!;

  return (
    <section className={styles.root} aria-labelledby={`blueprint-${app.id}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>INTERFACE ARCHITECTURE · {app.group.toUpperCase()}</p>
          <h2 id={`blueprint-${app.id}`}>Inside {app.name}</h2>
          <p className={styles.description}>A domain-specific interface blueprint for the next implementation stage.</p>
        </div>
        <span className={styles.status}>DESIGN HANDOFF</span>
      </header>
      <div className={styles.moduleGrid}>
        {modules.map((module) => (
          <button
            type="button"
            key={module.id}
            className={styles.module}
            data-selected={module.id === selected.id || undefined}
            aria-pressed={module.id === selected.id}
            onClick={() => setSelectedId(module.id)}
          >
            <span className={styles.moduleIcon}><Icon name={module.icon} size={18}/></span>
            <span className={styles.moduleCopy}><strong>{module.title}</strong><small>{module.description}</small></span>
            <Icon name="expand" size={14}/>
          </button>
        ))}
      </div>
      <article className={styles.detail} aria-live="polite">
        <div className={styles.detailHead}>
          <div><p className={styles.eyebrow}>SELECTED INTERFACE</p><h3>{selected.title}</h3></div>
          <span className={styles.pending}>BACKEND NOT CONNECTED</span>
        </div>
        <p className={styles.detailDescription}>{selected.description}</p>
        <div className={styles.screenPreview} aria-label={`${selected.title} interface layout preview`}>
          <div className={styles.screenTop}>
            <span className={styles.screenBrand}><Icon name={app.icon} size={13}/>{app.name}</span>
            <span className={styles.screenMode}>CONCEPT LAYOUT</span>
          </div>
          {app.group === "Education" ? <EducationCanvas app={app} module={selected}/> : (
        <>
        <div className={styles.screenBody}>
            <aside className={styles.screenRail} aria-hidden="true">
              <span className={styles.railMark}/>
              <span className={styles.railMark}/>
              <span className={styles.railMark}/>
              <span className={styles.railMark}/>
            </aside>
            <div className={styles.screenMain}>
              <div className={styles.screenHeading}>
                <span className={styles.screenKicker}>{app.name.toUpperCase()} / {selected.id.toUpperCase()}</span>
                <span className={styles.screenTitle}>{selected.title}</span>
                <span className={styles.screenSubline}/>
              </div>
              <div className={styles.screenWidgets} data-layout={selected.layout ?? "dashboard"}>
                {selected.regions.map((region, index) => (
                  <div className={styles.screenWidget} data-layout={index === 0 ? "primary" : index === 1 ? "secondary" : "tertiary"} key={region}>
                    <span className={styles.widgetIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.widgetName}>{region}</span>
                    <span className={styles.widgetLines}><i/><i/><i/></span>
                  </div>
                ))}
              </div>
            </div>
            <aside className={styles.screenContext}>
              <span className={styles.contextDot}/>
              <span className={styles.contextLine}/>
              <span className={styles.contextLine}/>
              <span className={styles.contextLine}/>
            </aside>
          </div>
          <div className={styles.screenFooter}><span>STRUCTURE ONLY · NO SAMPLE RECORDS</span><span>RESPONSIVE LAYOUT</span></div>
        </>
        )}
        </div>
        <div className={styles.regions}>
          {selected.regions.map((region, index) => (
            <div className={styles.region} key={region}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{region}</strong>
            </div>
          ))}
        </div>
        <p className={styles.handoffNote}>This is interface architecture only. Claude can connect these views to approved data contracts and working domain logic.</p>
      </article>
    </section>
  );
}
