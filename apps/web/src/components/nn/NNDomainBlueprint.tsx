"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { NNApplication } from "@/lib/apps/registry";
import styles from "./NNDomainBlueprint.module.css";

export type DomainLayout = "dashboard" | "navigator" | "library" | "planner" | "roadmap" | "reader" | "analytics" | "timeline" | "finance" | "inbox" | "flow" | "security" | "media" | "calculator" | "cards" | "map" | "editor" | "settings" | "board";

export interface DomainModule {
  id: string;
  layout?: DomainLayout;
  title: string;
  description: string;
  icon: IconName;
  regions: readonly string[];
}

const APP_LAYOUTS: Readonly<Record<string, Readonly<Record<string, DomainLayout>>>> = {
  soul: { reflections: "editor", gratitude: "timeline", principles: "cards" },
  mind: { focus: "timeline", journal: "editor", growth: "roadmap" },
  body: { training: "timeline", nutrition: "editor", recovery: "analytics" },
  contacts: { people: "cards", dates: "timeline", followups: "board" },
  "nature-universe": { observations: "map", questions: "navigator", fieldnotes: "editor" },
  "peace-mode": { quiet: "timeline", environment: "settings", reflection: "editor" },
  "formula-engine": { library: "library", workspace: "calculator", converter: "calculator" },
  "logic-lab": { challenges: "board", aptitude: "analytics", review: "reader" },
  "learning-vault": { library: "library", sources: "reader", recall: "cards" },
  finance: { overview: "finance", transactions: "finance", budgets: "finance", reports: "analytics" },
  invest: { watchlists: "finance", research: "reader", portfolio: "finance", performance: "analytics" },
  business: { ventures: "board", validation: "roadmap", operations: "board", decisions: "editor" },
  freelance: { clients: "cards", proposals: "editor", delivery: "board" },
  career: { skills: "roadmap", portfolio: "library", interviews: "timeline" },
  projects: { boards: "board", timeline: "timeline", retrospective: "editor" },
  achievements: { milestones: "roadmap", certificates: "library", evidence: "library" },
  "creator-studio": { calendar: "timeline", media: "media", production: "media" },
  studio: { documents: "editor", templates: "library", publishing: "media" },
  mail: { inbox: "inbox", compose: "editor", followups: "timeline" },
  english: { plan: "roadmap", listening: "media", speaking: "timeline", writing: "editor" },
  memory: { capture: "editor", connections: "navigator", review: "timeline" },
  "life-archive": { timeline: "timeline", collections: "library", search: "navigator" },
  analytics: { overview: "analytics", trends: "analytics", reports: "analytics" },
  travel: { trips: "planner", places: "map", planning: "timeline" },
  simulator: { scenarios: "roadmap", model: "calculator", results: "analytics" },
  "command-centre": { overview: "settings", activity: "timeline", integrations: "flow" },
  "automation-studio": { workflows: "flow", approvals: "security", runs: "timeline" },
  "security-centre": { access: "security", sessions: "security", audit: "security" },
  "control-room": { environment: "settings", preferences: "settings", data: "security" },
};

export function inferDomainLayout(appId: string, module: DomainModule): DomainLayout {
  if (module.layout) return module.layout;
  const appLayout = APP_LAYOUTS[appId]?.[module.id];
  if (appLayout) return appLayout;
  const key = `${module.id} ${module.title}`.toLowerCase();
  if (/(ledger|budget|transaction|watchlist|investment|cash-flow|billing|invoice|account|holding)/.test(key)) return "finance";
  if (/(inbox|mail|message|follow-up|draft|compose)/.test(key)) return "inbox";
  if (/(workflow|automation|approval|integration|execution|runs|process)/.test(key)) return "flow";
  if (/(security|access|audit|device|session|permission)/.test(key)) return "security";
  if (/(media|creator|publishing|production|content|asset|camera)/.test(key)) return "media";
  if (/(formula|compute|converter|calculation|model)/.test(key)) return "calculator";
  if (/(travel|trip|place|itinerary|map)/.test(key)) return "map";
  if (/(board|project|task|milestone|operations|deliverable)/.test(key)) return "board";
  if (/(contact|people|profile|relationship|client)/.test(key)) return "cards";
  if (/(preference|environment|control|setting|data)/.test(key)) return "settings";
  if (/(lesson|journal|writing|document|reflection|notes|retrospective|editor)/.test(key)) return "editor";
  if (/(date|timeline|calendar|session|focus|schedule|interview|practice|activity|training)/.test(key)) return "timeline";
  if (/(library|archive|collection|card|vault|portfolio|evidence|course|book)/.test(key)) return "library";
  if (/(path|roadmap|scenario|skill)/.test(key)) return "roadmap";
  if (/(trend|analytics|mastery|metric|report|result|growth|recovery)/.test(key)) return "analytics";
  if (/(syllabus|navigator|structure|graph|connection|question|unit)/.test(key)) return "navigator";
  const appDefaults: Partial<Record<string, DomainLayout>> = {
    finance: "finance",
    invest: "finance",
    analytics: "analytics",
    travel: "map",
    "security-centre": "security",
    "control-room": "settings",
    "automation-studio": "flow",
    "command-centre": "flow",
    "creator-studio": "media",
  };
  return appDefaults[appId] ?? "dashboard";
}


export const DOMAIN_BLUEPRINTS: Readonly<Record<string, readonly DomainModule[]>> = {
  soul: [
    { id: "reflections", title: "Reflect", description: "A private writing environment for thoughts, values and personal reflection.", icon: "file", regions: ["Writing canvas", "Date and context", "Private archive"] },
    { id: "gratitude", title: "Gratitude", description: "A quiet way to capture what matters without turning gratitude into a score.", icon: "sparkle", regions: ["Daily entry", "Past entries", "Search and revisit"] },
    { id: "principles", title: "Principles", description: "Keep chosen principles visible and connected to real decisions.", icon: "book", regions: ["Principle cards", "Personal notes", "Review view"] },
  ],
  mind: [
    { id: "focus", title: "Focus", description: "A distraction-light place for deliberate work and reflection.", icon: "clock", regions: ["Session intention", "Focus timer", "Recorded sessions"] },
    { id: "journal", title: "Journal", description: "A structured journal with private entries and source-aware context.", icon: "file", regions: ["Entry editor", "Mood/context fields", "Entry history"] },
    { id: "growth", title: "Growth", description: "Organise personal learning goals and the steps you choose to take.", icon: "compass", regions: ["Growth areas", "Chosen practices", "Review notes"] },
  ],
  body: [
    { id: "training", title: "Training", description: "Plan and review training sessions without invented performance data.", icon: "pulse", regions: ["Session planner", "Exercise details", "Training history"] },
    { id: "nutrition", title: "Nutrition", description: "Record meals and observations with a clear source for each entry.", icon: "file", regions: ["Meal capture", "Daily journal", "Food notes"] },
    { id: "recovery", title: "Recovery", description: "Bring sleep and recovery records into one readable personal view.", icon: "moon", regions: ["Sleep records", "Recovery notes", "Trend view when data exists"] },
  ],
  contacts: [
    { id: "people", title: "People", description: "A private relationship directory with useful context and follow-up history.", icon: "people", regions: ["Contact profile", "Relationship notes", "Linked dates"] },
    { id: "dates", title: "Dates", description: "Keep birthdays and meaningful occasions in a dedicated calendar view.", icon: "calendar", regions: ["Date timeline", "Person links", "Reminder settings"] },
    { id: "followups", title: "Follow-ups", description: "Track conversations that need a next step.", icon: "check", regions: ["Open follow-ups", "Due-date view", "Completed history"] },
  ],
  "nature-universe": [
    { id: "observations", title: "Observations", description: "Capture discoveries with time, place and source context.", icon: "globe", regions: ["Observation capture", "Location and date", "Source references"] },
    { id: "questions", title: "Questions", description: "Keep open questions and connect them to answers you verify.", icon: "search", regions: ["Open questions", "Research notes", "Verified answers"] },
    { id: "fieldnotes", title: "Fieldnotes", description: "A calm notebook for nature, science and astronomy discoveries.", icon: "book", regions: ["Notebook", "Media references", "Linked observations"] },
  ],
  "peace-mode": [
    { id: "quiet", title: "Stillness", description: "A minimal environment for intentional quiet time.", icon: "moon", regions: ["Session intention", "Quiet timer", "Private reflection"] },
    { id: "environment", title: "Focus", description: "A reduced-stimulation view with only the controls you choose.", icon: "sliders", regions: ["Appearance controls", "Distraction preferences", "Session state"] },
    { id: "reflection", title: "Reflect", description: "Capture a short reflection after a quiet session.", icon: "file", regions: ["Reflection editor", "Session links", "Private history"] },
  ],
  college: [
    { id: "semester", layout: "planner", title: "Semester", description: "A clear academic home for subjects, exams and the work ahead.", icon: "calendar", regions: ["Semester selector", "Subject cards", "Upcoming academic dates"] },
    { id: "syllabus", layout: "navigator", title: "Syllabus", description: "Move from a subject into units, topics and source material.", icon: "book", regions: ["Subject overview", "Unit navigator", "Topic notes"] },
    { id: "question-bank", layout: "library", title: "Question Bank", description: "Browse questions by subject, unit, marks and source.", icon: "search", regions: ["Question filters", "Question reader", "Answer workspace"] },
    { id: "exam-prep", layout: "planner", title: "Exam Prep", description: "Organise assignments, timetable, attendance, marks and revision.", icon: "graph", regions: ["Assignment board", "Exam timetable", "Attendance and marks"] },
  ],
  academy: [
    { id: "paths", layout: "roadmap", title: "Paths", description: "Build structured technical and professional learning journeys.", icon: "compass", regions: ["Path overview", "Milestone map", "Prerequisite links"] },
    { id: "courses", layout: "library", title: "Courses", description: "Keep courses and learning resources organised by skill.", icon: "book", regions: ["Course catalogue", "Course detail", "Resource list"] },
    { id: "lesson", layout: "reader", title: "Lesson", description: "Read, practise and save lesson notes in one focused surface.", icon: "file", regions: ["Lesson reader", "Practice area", "Saved notes"] },
    { id: "mastery", layout: "analytics", title: "Mastery", description: "Review actual practice and identify what needs another pass.", icon: "graph", regions: ["Practice history", "Revision queue", "Skill review"] },
  ],
  "formula-engine": [
    { id: "library", title: "Formulas", description: "A searchable reference with units, definitions and source notes.", icon: "formula", regions: ["Formula index", "Formula detail", "Source reference"] },
    { id: "workspace", title: "Compute", description: "A structured space for inputs, steps and checked results.", icon: "circuit", regions: ["Input fields", "Step-by-step derivation", "Result and units"] },
    { id: "converter", title: "Units", description: "Convert compatible units with explicit conversion assumptions.", icon: "sliders", regions: ["Quantity input", "Unit selectors", "Conversion explanation"] },
  ],
  "logic-lab": [
    { id: "challenges", title: "Challenges", description: "Work through reasoning and programming challenges.", icon: "circuit", regions: ["Challenge list", "Problem statement", "Answer workspace"] },
    { id: "aptitude", title: "Aptitude", description: "Organise timed and untimed practice by topic.", icon: "clock", regions: ["Topic selector", "Practice session", "Answer review"] },
    { id: "review", title: "Solutions", description: "Compare attempts with verified explanations and source material.", icon: "search", regions: ["Attempt history", "Explanation panel", "Mistake notes"] },
  ],
  "learning-vault": [
    { id: "library", title: "Library", description: "A central catalogue for books, courses and learning resources.", icon: "book", regions: ["Library grid", "Resource detail", "Reading status"] },
    { id: "sources", title: "Reader", description: "Keep source documents and notes connected.", icon: "file", regions: ["Document reader", "Highlights and notes", "Citation details"] },
    { id: "recall", title: "Recall", description: "A place for flashcards, spaced review and connected knowledge.", icon: "archive", regions: ["Flashcard deck", "Review session", "Knowledge links"] },
  ],
  finance: [
    { id: "overview", title: "Overview", description: "A high-contrast overview built only from connected, verified records.", icon: "wallet", regions: ["Account summary", "Cash-flow view", "Data freshness and source"] },
    { id: "transactions", title: "Ledger", description: "Review and categorise recorded income and expenses.", icon: "layers", regions: ["Transaction list", "Category filters", "Transaction detail"] },
    { id: "budgets", title: "Budgets", description: "Organise planned spending and financial targets.", icon: "graph", regions: ["Budget categories", "Goal progress", "Period review"] },
    { id: "reports", title: "Reports", description: "Understand financial patterns with visible provenance.", icon: "file", regions: ["Period selector", "Cash-flow breakdown", "Exportable report"] },
  ],
  invest: [
    { id: "watchlists", title: "Watchlist", description: "Follow selected assets with clear exchange and currency context.", icon: "trend", regions: ["Watchlist groups", "Asset detail", "Quote timestamp"] },
    { id: "research", title: "Research", description: "Compare company fundamentals and keep source-backed research.", icon: "search", regions: ["Research notes", "Fundamental data", "Source links"] },
    { id: "portfolio", title: "Portfolio", description: "Track holdings only when actual portfolio records or a provider are connected.", icon: "wallet", regions: ["Holdings table", "Allocation view", "Valuation timestamp"] },
    { id: "performance", title: "Performance", description: "Review performance with fees, currency and date assumptions visible.", icon: "graph", regions: ["Period comparison", "Return methodology", "Risk notes"] },
  ],
  business: [
    { id: "ventures", title: "Ventures", description: "Keep business ideas, ventures and operating context together.", icon: "briefcase", regions: ["Venture overview", "Business model", "Key documents"] },
    { id: "validation", title: "Validate", description: "Organise assumptions, experiments and evidence.", icon: "check", regions: ["Assumption list", "Experiment cards", "Evidence review"] },
    { id: "operations", title: "Operations", description: "Map recurring work, responsibilities and process documentation.", icon: "layers", regions: ["Process map", "Operating checklist", "Decision log"] },
    { id: "decisions", title: "Decisions", description: "Record decisions with context and the evidence available at the time.", icon: "file", regions: ["Decision statement", "Evidence and alternatives", "Outcome review"] },
  ],
  freelance: [
    { id: "clients", title: "Clients", description: "Keep client context, conversations and active work in one place.", icon: "people", regions: ["Client profiles", "Project links", "Communication history"] },
    { id: "proposals", title: "Proposals", description: "Prepare scoped proposals with clear deliverables and assumptions.", icon: "file", regions: ["Proposal editor", "Scope and pricing", "Approval state"] },
    { id: "delivery", title: "Delivery", description: "Track deliverables, invoices and the work awaiting review.", icon: "check", regions: ["Project milestones", "Deliverable review", "Invoice status"] },
  ],
  career: [
    { id: "skills", title: "Skills", description: "Organise skills, evidence and the next learning milestone.", icon: "compass", regions: ["Skill categories", "Evidence links", "Learning priorities"] },
    { id: "portfolio", title: "Portfolio", description: "Present verified projects, work samples and achievements.", icon: "layers", regions: ["Project gallery", "Case-study detail", "Evidence links"] },
    { id: "interviews", title: "Interview", description: "Prepare technical topics, practice and interview reflections.", icon: "mic", regions: ["Preparation plan", "Practice prompts", "Review notes"] },
  ],
  projects: [
    { id: "boards", title: "Projects", description: "A visual space for milestones, work items and delivery.", icon: "layers", regions: ["Board view", "Task detail", "Filters and grouping"] },
    { id: "timeline", title: "Timeline", description: "Understand dependencies and sequencing across a project.", icon: "calendar", regions: ["Milestone timeline", "Dependency map", "Schedule detail"] },
    { id: "retrospective", title: "Review", description: "Capture delivery lessons and decisions for the next cycle.", icon: "file", regions: ["Review prompts", "Lessons learned", "Next actions"] },
  ],
  achievements: [
    { id: "milestones", title: "Milestones", description: "Keep a record of meaningful milestones and their dates.", icon: "trophy", regions: ["Milestone timeline", "Achievement detail", "Related projects"] },
    { id: "certificates", title: "Credentials", description: "Organise certificates and the evidence behind each claim.", icon: "archive", regions: ["Certificate library", "Issuer and date", "Verification link"] },
    { id: "evidence", title: "Evidence", description: "Connect claims to files, links and source records.", icon: "folder", regions: ["Evidence collection", "Source details", "Share-ready view"] },
  ],
  "creator-studio": [
    { id: "calendar", title: "Calendar", description: "Plan content with clear draft, review and publish states.", icon: "calendar", regions: ["Calendar view", "Content card", "Channel selector"] },
    { id: "media", title: "Assets", description: "Organise source media and creative assets.", icon: "camera", regions: ["Asset grid", "Asset detail", "Usage rights and source"] },
    { id: "production", title: "Production", description: "Move creative work through a deliberate production pipeline.", icon: "layers", regions: ["Production stages", "Creative brief", "Review checklist"] },
  ],
  studio: [
    { id: "documents", title: "Documents", description: "Write and organise documents with a clear editing hierarchy.", icon: "file", regions: ["Document list", "Editor canvas", "Document metadata"] },
    { id: "templates", title: "Templates", description: "Start from reusable structures without locking the writing.", icon: "layers", regions: ["Template library", "Template preview", "New document flow"] },
    { id: "publishing", title: "Publish", description: "Prepare drafts and review publication details before approval.", icon: "check", regions: ["Draft queue", "Preview", "Approval checkpoint"] },
  ],
  mail: [
    { id: "inbox", title: "Inbox", description: "A calm message list with clear unread and priority states.", icon: "mail", regions: ["Mailbox list", "Message preview", "Search and filters"] },
    { id: "compose", title: "Compose", description: "Prepare messages with recipient checks and a clear send approval step.", icon: "pen", regions: ["Recipient fields", "Message editor", "Send confirmation"] },
    { id: "followups", title: "Follow-ups", description: "Keep unanswered conversations visible without sending automatically.", icon: "clock", regions: ["Follow-up queue", "Conversation context", "Reminder settings"] },
  ],
  english: [
    { id: "plan", title: "Practice", description: "A structured path for speaking, listening, grammar and writing.", icon: "calendar", regions: ["Weekly plan", "Daily practice", "Progress review"] },
    { id: "listening", title: "Listen", description: "Practise with source audio, transcripts and comprehension checks.", icon: "mic", regions: ["Audio player", "Transcript", "Comprehension questions"] },
    { id: "speaking", title: "Speak", description: "A private practice space for pronunciation and spoken responses.", icon: "language", regions: ["Speaking prompt", "Recording control", "Pronunciation feedback"] },
    { id: "writing", title: "Write", description: "Work through grammar, vocabulary and writing corrections.", icon: "pen", regions: ["Exercise editor", "Correction view", "Vocabulary notebook"] },
  ],
  memory: [
    { id: "capture", title: "Capture", description: "Save useful knowledge with its original source and context.", icon: "archive", regions: ["Capture form", "Source metadata", "Saved knowledge"] },
    { id: "connections", title: "Graph", description: "Explore links between saved facts, projects and decisions.", icon: "flow", regions: ["Connection graph", "Related records", "Provenance panel"] },
    { id: "review", title: "Review", description: "Revisit saved information and correct outdated context.", icon: "check", regions: ["Review queue", "Source comparison", "Correction history"] },
  ],
  "life-archive": [
    { id: "timeline", title: "Timeline", description: "Browse dated records and milestones from your own archive.", icon: "clock", regions: ["Timeline", "Date filters", "Record detail"] },
    { id: "collections", title: "Collections", description: "Group important memories, files and milestones.", icon: "folder", regions: ["Collection grid", "Collection detail", "Linked items"] },
    { id: "search", title: "Archive", description: "Find archived items by date, source and linked context.", icon: "search", regions: ["Search field", "Result list", "Provenance detail"] },
  ],
  analytics: [
    { id: "overview", title: "Overview", description: "A clear view of available records, with no invented metrics.", icon: "graph", regions: ["Metric definitions", "Source coverage", "Last updated"] },
    { id: "trends", title: "Trends", description: "Explore change over time only where sufficient source data exists.", icon: "trend", regions: ["Time range", "Trend chart", "Data quality note"] },
    { id: "reports", title: "Reports", description: "Build reports with filters and visible calculation methods.", icon: "file", regions: ["Report builder", "Filters", "Export preview"] },
  ],
  travel: [
    { id: "trips", title: "Trips", description: "Organise trip details, dates and related documents.", icon: "plane", regions: ["Trip overview", "Itinerary", "Travel documents"] },
    { id: "places", title: "Places", description: "Save places and map them to a planned journey.", icon: "globe", regions: ["Saved places", "Map view", "Place detail"] },
    { id: "planning", title: "Itinerary", description: "Bring bookings, transport and budgets into one itinerary.", icon: "calendar", regions: ["Day-by-day plan", "Booking references", "Budget overview"] },
  ],
  simulator: [
    { id: "scenarios", title: "Scenarios", description: "Define assumptions and inputs before running a model.", icon: "sliders", regions: ["Scenario setup", "Input controls", "Assumption notes"] },
    { id: "model", title: "Model", description: "Inspect the model and calculation steps behind a result.", icon: "formula", regions: ["Model definition", "Calculation trace", "Validation checks"] },
    { id: "results", title: "Results", description: "Compare generated scenarios with limitations and assumptions visible.", icon: "graph", regions: ["Result comparison", "Sensitivity view", "Export and notes"] },
  ],
  "command-centre": [
    { id: "overview", title: "System", description: "A factual view of connected services and their verified state.", icon: "grid", regions: ["Service inventory", "Current state", "Last verification"] },
    { id: "activity", title: "Activity", description: "Review system events with timestamps and source information.", icon: "clock", regions: ["Event stream", "Event detail", "Filters"] },
    { id: "integrations", title: "Connect", description: "Inspect connected providers, permissions and configuration.", icon: "flow", regions: ["Provider list", "Permission detail", "Connection test"] },
  ],
  "automation-studio": [
    { id: "workflows", title: "Flow", description: "Design trigger and action sequences with approval checkpoints.", icon: "flow", regions: ["Workflow canvas", "Trigger configuration", "Action sequence"] },
    { id: "approvals", title: "Approvals", description: "Review consequential actions before any execution.", icon: "shield", regions: ["Pending approvals", "Action summary", "Audit record"] },
    { id: "runs", title: "Runs", description: "Inspect actual workflow executions and failure reasons.", icon: "clock", regions: ["Execution history", "Run detail", "Retry eligibility"] },
  ],
  "security-centre": [
    { id: "access", title: "Access", description: "Review authentication methods and access controls.", icon: "shield", regions: ["Sign-in methods", "Owner claim status", "Access history"] },
    { id: "sessions", title: "Devices", description: "Inspect sessions and registered devices from verified records.", icon: "cube", regions: ["Active sessions", "Device list", "Revoke confirmation"] },
    { id: "audit", title: "Audit", description: "Review security events with source and timestamp context.", icon: "file", regions: ["Audit timeline", "Event detail", "Exportable evidence"] },
  ],
  "control-room": [
    { id: "environment", title: "Environment", description: "Understand the current interface environment and available capabilities.", icon: "sliders", regions: ["Appearance", "Motion preferences", "Display density"] },
    { id: "preferences", title: "Preferences", description: "Set personal defaults for the way NN behaves and appears.", icon: "settings", regions: ["Preference groups", "Per-app defaults", "Reset controls"] },
    { id: "data", title: "Data", description: "Review export, retention and privacy controls before changing them.", icon: "archive", regions: ["Data inventory", "Export options", "Destructive-action approval"] },
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
      {kind === "planner" && module.id === "semester" ? (
        <div className={styles.semesterPlanner} data-education-screen="semester">
          <header><div><span>ACADEMIC OVERVIEW</span><strong>Semester workspace</strong></div><small>NO DATES ADDED</small></header>
          <div className={styles.semesterSubjects}>{regions.map((region,index)=><div key={region}><span>{String(index+1).padStart(2,"0")}</span><strong>{region}</strong><small>SUBJECT SPACE</small></div>)}</div>
          <div className={styles.semesterWeek}><div className={styles.semesterWeekHead}><strong>Academic calendar</strong><small>EMPTY SCHEDULE</small></div><div className={styles.semesterWeekDays}>{["MON","TUE","WED","THU","FRI","SAT","SUN"].map(day=><div key={day}><span>{day}</span><i/><i/></div>)}</div></div>
        </div>
      ) : null}
      {kind === "planner" && module.id === "exam-prep" ? (
        <div className={styles.examPrepBoard} data-education-screen="exam-prep">
          <header><div><span>PREPARATION WORKSPACE</span><strong>Exam readiness</strong></div><small>NO RECORDS</small></header>
          <div className={styles.examPrepColumns}>{["Assignments","Exams","Attendance","Marks"].map((lane,index)=><section key={lane}><div><strong>{lane}</strong><span>0</span></div><article><i/><small>{index===0?"No assignments":index===1?"No exams scheduled":index===2?"No attendance records":"No marks recorded"}</small></article></section>)}</div>
          <footer>Academic data appears here after you add verified records</footer>
        </div>
      ) : null}
      {kind === "planner" && module.id !== "semester" && module.id !== "exam-prep" ? (
        <div className={styles.educationPlanner}><span>ACADEMIC TIMELINE</span>{regions.map((region,index)=><div className={styles.timelineRow} key={region}><span>{String(index+1).padStart(2,"0")}</span><i/><strong>{region}</strong><small>PLANNING AREA</small></div>)}</div>
      ) : null}
      {kind === "library" && module.id === "question-bank" ? (
        <div className={styles.questionBank} data-education-screen="question-bank">
          <aside><span>FILTER QUESTIONS</span>{["Subject","Unit","Marks","Question type","Source"].map(filter=><div key={filter}><strong>{filter}</strong><i/><small>NOT SELECTED</small></div>)}</aside>
          <section><header><div><span>QUESTION COLLECTION</span><strong>Question reader</strong></div><small>NO QUESTIONS ADDED</small></header><div className={styles.questionBankEmpty}><span>Q</span><strong>Your question bank is empty</strong><small>Add questions with their subject, unit, marks and source to build a searchable collection</small></div><footer><span>ANSWER WORKSPACE</span><i/><i/><i/></footer></section>
        </div>
      ) : null}
      {kind === "library" && module.id !== "question-bank" ? (
        <div className={styles.educationSplit}>
          <aside className={styles.educationTree}><span>{isCollege ? "QUESTION FILTERS" : "COURSE FILTERS"}</span>{regions.slice(0,2).map((region,index)=><div key={region} data-active={index===0}><i/>{region}</div>)}</aside>
          <div className={styles.educationList}><span>{isCollege ? "QUESTION COLLECTION" : "COURSE LIBRARY"}</span>{regions.map((region,index)=><div className={styles.educationListRow} key={region}><span>{String(index+1).padStart(2,"0")}</span><strong>{region}</strong><i/></div>)}</div>
        </div>
      ) : null}
      {kind === "library" && app.id === "academy" && module.id === "courses" ? (
        <div className={styles.academyCatalog} data-education-screen="academy-courses">
          <header><div><span>LEARNING LIBRARY</span><strong>Course catalogue</strong></div><small>NO COURSES ADDED</small></header>
          <div className={styles.academyCourseGrid}>{regions.map((region,index)=><article key={region}><span>{String(index+1).padStart(2,"0")}</span><strong>{region}</strong><i/><small>COURSE SPACE</small></article>)}</div>
        </div>
      ) : null}
      {kind === "reader" && app.id === "academy" ? (
        <div className={styles.academyLesson} data-education-screen="academy-lesson">
          <aside><span>LESSON OUTLINE</span>{regions.map((region,index)=><div key={region} data-active={index===0}><span>{String(index+1).padStart(2,"0")}</span><strong>{region}</strong></div>)}</aside>
          <section><header><span>LESSON READER</span><small>NO LESSON SELECTED</small></header><div className={styles.academyLessonEmpty}><span>01</span><strong>Choose a lesson to begin</strong><small>Lesson content, practice activities and saved notes will appear in this workspace</small></div><footer><span>PRACTICE AREA</span><i/><i/><i/></footer></section>
        </div>
      ) : null}
      {kind === "analytics" && app.id === "academy" ? (
        <div className={styles.academyMastery} data-education-screen="academy-mastery">
          <header><div><span>SKILL REVIEW</span><strong>Mastery overview</strong></div><small>NO PRACTICE DATA</small></header>
          <div className={styles.academyMasteryGrid}>{regions.map((region,index)=><article key={region}><span>{String(index+1).padStart(2,"0")}</span><strong>{region}</strong><div><i/></div><small>AWAITING ACTUAL PRACTICE</small></article>)}</div>
          <footer>Progress is calculated only from recorded practice</footer>
        </div>
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
        <div className={styles.educationAnalytics}><span>MASTERY</span><div className={styles.masteryBars}>{regions.map((region)=><div key={region}><i/><strong>{region}</strong></div>)}</div></div>
      ) : null}
    </div>
  );
}


function DomainCanvas({ app, module }: { app: NNApplication; module: DomainModule }) {
  const layout = inferDomainLayout(app.id, module);
  const regions = module.regions;
  const rows = regions.map((region, index) => ({ region, index }));

  return (
    <div className={styles.domainCanvas} data-layout={layout} data-layout-surface={layout} aria-label={`${module.title} ${layout} layout preview`}>
      <div className={styles.domainCanvasHead}>
        <span>{app.name.toUpperCase()} / {module.title.toUpperCase()}</span>
        <span>DESIGN PREVIEW</span>
      </div>

      {layout === "timeline" || layout === "planner" || layout === "roadmap" ? (
        <div className={styles.domainTimeline} data-structure={layout}>
          {rows.map(({ region, index }) => (
            <div className={styles.domainTimelineRow} key={region}>
              <span className={styles.domainTimelineMarker}>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{region}</strong><i/><small>{layout === "roadmap" ? "MILESTONE SPACE" : layout === "planner" ? "PLANNING AREA" : "ENTRY SPACE"}</small></div>
            </div>
          ))}
        </div>
      ) : null}

      {layout === "finance" ? (
        <div className={styles.domainFinance} data-structure="finance">
          <div className={styles.domainFinanceSummary}><span>ACCOUNT SUMMARY</span><strong>—</strong><small>Connect a verified data source</small><div className={styles.domainSparkline}><i/><i/><i/><i/><i/><i/><i/></div></div>
          <div className={styles.domainLedger}>
            {rows.map(({ region, index }) => <div key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong><i/><small>NO RECORDS</small></div>)}
          </div>
        </div>
      ) : null}

      {layout === "inbox" ? (
        <div className={styles.domainInbox} data-structure="inbox">
          <div className={styles.domainInboxRail}><span>MAILBOX</span><i/><i/><i/></div>
          <div className={styles.domainInboxList}>{rows.map(({ region, index }) => <div key={region}><span className={styles.domainAvatar}>{String(index + 1).padStart(2, "0")}</span><div><strong>{region}</strong><i/><small>MESSAGE PREVIEW</small></div><span>—</span></div>)}</div>
        </div>
      ) : null}

      {layout === "flow" ? (
        <div className={styles.domainFlow} data-structure="flow">
          {rows.map(({ region, index }) => <div className={styles.domainFlowNode} key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong><small>{index === 0 ? "TRIGGER" : index === rows.length - 1 ? "RESULT" : "ACTION"}</small></div>)}
        </div>
      ) : null}

      {layout === "security" ? (
        <div className={styles.domainSecurity} data-structure="security">
          <div className={styles.domainSecurityHeader}><span className={styles.domainShield}><Icon name="shield" size={22} solid tone="ice"/></span><div><strong>Security controls</strong><small>Connect a verified security provider to inspect live state</small></div></div>
          {rows.map(({ region, index }) => <div className={styles.domainSettingRow} key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong><small>NOT CONNECTED</small></div>)}
        </div>
      ) : null}

      {layout === "media" ? (
        <div className={styles.domainMedia} data-structure="media">
          {rows.map(({ region, index }) => <div className={styles.domainMediaTile} key={region}><span className={styles.domainMediaGlyph}><Icon name={index === 0 ? "camera" : "layers"} size={20} solid tone="ice"/></span><strong>{region}</strong><small>ASSET SPACE</small></div>)}
        </div>
      ) : null}

      {layout === "calculator" ? (
        <div className={styles.domainCalculator} data-structure="calculator">
          <div className={styles.domainCalcDisplay}><span>COMPUTATION WORKSPACE</span><strong>—</strong><small>Enter inputs to calculate</small></div>
          <div className={styles.domainCalcFields}>{rows.map(({ region, index }) => <div key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong><i/></div>)}</div>
        </div>
      ) : null}

      {layout === "map" ? (
        <div className={styles.domainMap} data-structure="map">
          <div className={styles.domainMapCanvas}><span/><span/><span/><i/><i/><i/><small>MAP DATA NOT CONNECTED</small></div>
          <div className={styles.domainMapPlaces}>{rows.map(({ region, index }) => <div key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong></div>)}</div>
        </div>
      ) : null}

      {layout === "editor" || layout === "reader" ? (
        <div className={styles.domainDocument} data-structure={layout}>
          <div className={styles.domainDocumentPage}><span>{layout === "reader" ? "READING VIEW" : "DOCUMENT CANVAS"}</span><strong>{module.title}</strong><div className={styles.domainDocumentLines}><i/><i/><i/><i/><i/><i/></div><div className={styles.domainDocumentCallout}/><div className={styles.domainDocumentLines}><i/><i/><i/></div></div>
          <aside className={styles.domainDocumentAside}>{rows.map(({ region, index }) => <div key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong></div>)}</aside>
        </div>
      ) : null}

      {layout === "settings" ? (
        <div className={styles.domainSettings} data-structure="settings">
          {rows.map(({ region, index }) => <div className={styles.domainSettingRow} key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong><i aria-hidden="true"/></div>)}
        </div>
      ) : null}

      {layout === "board" ? (
        <div className={styles.domainBoard} data-structure="board">
          {rows.map(({ region }) => <div className={styles.domainBoardColumn} key={region}><strong>{region}</strong><small>WORKSPACE</small><i/><i/></div>)}
        </div>
      ) : null}

      {layout === "cards" || layout === "library" ? (
        <div className={styles.domainCards} data-structure={layout}>
          {rows.map(({ region, index }) => <div className={styles.domainCard} key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong><i/><small>{layout === "library" ? "RESOURCE DETAIL" : "PERSONAL SPACE"}</small></div>)}
        </div>
      ) : null}

      {layout === "analytics" ? (
        <div className={styles.domainAnalytics} data-structure="analytics">
          <div className={styles.domainChart}><span>DATA VISUALISATION</span><div className={styles.domainChartGrid}><i/><i/><i/><i/></div><small>NO SOURCE DATA</small></div>
          <div className={styles.domainAnalyticsLegend}>{rows.map(({ region, index }) => <div key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong></div>)}</div>
        </div>
      ) : null}

      {layout === "navigator" ? (
        <div className={styles.domainNavigator} data-structure="navigator">
          <aside>{rows.map(({ region, index }) => <div key={region} data-active={index === 0}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong></div>)}</aside>
          <div><span>SELECTED NODE</span><strong>{module.title}</strong><i/><i/><i/><small>Choose a node to inspect its connections</small></div>
        </div>
      ) : null}

      {layout === "dashboard" ? (
        <div className={styles.domainCards} data-structure="dashboard">
          {rows.map(({ region, index }) => <div className={styles.domainCard} key={region}><span>{String(index + 1).padStart(2, "0")}</span><strong>{region}</strong><i/><small>OVERVIEW PANEL</small></div>)}
        </div>
      ) : null}
    </div>
  );
}

export function NNDomainBlueprint({ app }: { app: NNApplication }) {
  const modules = DOMAIN_BLUEPRINTS[app.id];
  const [selectedId, setSelectedId] = useState(modules?.[0]?.id ?? "");
  useEffect(() => {
    setSelectedId(modules?.[0]?.id ?? "");
  }, [app.id, modules]);
  if (!modules?.length) return null;
  const selected = modules.find((module) => module.id === selectedId) ?? modules[0]!;

  return (
    <section className={styles.root} aria-labelledby={`blueprint-${app.id}`}>
      <header className={styles.header}>
        <h2 id={`blueprint-${app.id}`}>Spaces</h2>
      </header>
      <div className={styles.moduleGrid} role="tablist" aria-label={`${app.name} spaces`} aria-orientation="horizontal">
        {modules.map((module, index) => (
          <button
            type="button"
            key={module.id}
            id={`${app.id}-space-${module.id}`}
            className={styles.module}
            role="tab"
            aria-label={module.title}
            aria-describedby={`${app.id}-space-description-${module.id}`}
            data-selected={module.id === selected.id || undefined}
            aria-selected={module.id === selected.id}
            aria-controls={`${app.id}-space-preview`}
            tabIndex={module.id === selected.id ? 0 : -1}
            onKeyDown={(event) => {
              let nextIndex = index;
              if (event.key === "ArrowRight") nextIndex = (index + 1) % modules.length;
              else if (event.key === "ArrowLeft") nextIndex = (index - 1 + modules.length) % modules.length;
              else if (event.key === "Home") nextIndex = 0;
              else if (event.key === "End") nextIndex = modules.length - 1;
              else return;
              event.preventDefault();
              const next = modules[nextIndex]!;
              setSelectedId(next.id);
              document.getElementById(`${app.id}-space-${next.id}`)?.focus();
            }}
            onClick={() => setSelectedId(module.id)}
          >
            <span className={styles.moduleIcon}><Icon name={module.icon} size={20} solid tone="ice"/></span>
            <span className={styles.moduleCopy}><strong>{module.title}</strong><small id={`${app.id}-space-description-${module.id}`}>{module.description}</small></span>
            <Icon name="expand" size={14}/>
          </button>
        ))}
      </div>
      <article
          className={styles.detail}
          id={`${app.id}-space-preview`}
          role="tabpanel"
          aria-labelledby={`${app.id}-space-${selected.id}`}
          tabIndex={0}
          aria-live="polite"
          key={selected.id}
        >
        <div className={styles.detailHead}>
          <h3>{selected.title}</h3>
          <span className={styles.pending}>PREVIEW</span>
        </div>
        <div className={styles.screenPreview} role="group" aria-label={`${selected.title} interface preview`}>
          <div className={styles.screenTop}>
            <span className={styles.screenBrand}><Icon name={app.icon} size={14} solid tone="ice"/>{app.name}</span>
          </div>
          {app.id === "college" || app.id === "academy" ? <EducationCanvas app={app} module={selected}/> : (
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
              <DomainCanvas app={app} module={selected}/>
            </div>
            <aside className={styles.screenContext}>
              <span className={styles.contextDot}/>
              <span className={styles.contextLine}/>
              <span className={styles.contextLine}/>
              <span className={styles.contextLine}/>
            </aside>
          </div>
        </>
        )}
        </div>

      </article>
    </section>
  );
}
