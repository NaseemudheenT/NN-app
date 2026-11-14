/**
 * What each NN application actually holds.
 *
 * An application is not a screen; it is a set of the founder's own records
 * with a shape. This is that shape, and it is the only thing that separates
 * one application from another: the same surface, the same record layer, the
 * same rules, pointed at different collections with different fields.
 *
 * Every collection here lives under `users/{uid}/…`, so the one ownership
 * check in the security rules protects all of them — including the ones added
 * after the rules were written, which is the whole point of that design.
 *
 * Collection names are permanent. Renaming one orphans the founder's records
 * rather than moving them; a migration would have to copy them deliberately.
 */

export type FieldType = "text" | "longtext" | "number" | "date" | "choice";

export interface AppField {
  key: string;
  label: string;
  type: FieldType;
  /** For `choice`. The first is the default. */
  choices?: readonly string[];
  /** Shown under the input when there is something worth saying. */
  hint?: string;
}

export interface AppSection {
  /** Tab label, and the plural noun for a count. */
  name: string;
  /** The owner collection this reads and writes. Permanent. */
  collection: string;
  /** What one record is called: "a note", "a contact". */
  noun: string;
  /** One line about what belongs here. */
  hint: string;
  /**
   * Fields beyond the title. Every record has a title; these are the rest,
   * and they are what makes Finance different from Contacts.
   */
  fields: readonly AppField[];
}

const STATUS = (...choices: string[]): AppField => ({
  key: "status", label: "Status", type: "choice", choices,
});

const NOTE: AppField = { key: "detail", label: "Detail", type: "longtext" };
const WHEN = (label = "Date"): AppField => ({ key: "at", label, type: "date" });
const AMOUNT = (label = "Amount"): AppField => ({ key: "amount", label, type: "number" });
const SOURCE: AppField = {
  key: "source", label: "Source", type: "text",
  hint: "Where this came from. NN never invents a source.",
};

/** Sections by application id. An application with none has no work surface. */
export const APP_SECTIONS: Readonly<Record<string, readonly AppSection[]>> = {
  /* ---- Life & wellbeing ------------------------------------------------ */
  soul: [
    { name: "Reflections", collection: "soul_reflections", noun: "a reflection",
      hint: "Private writing, kept as you wrote it.",
      fields: [NOTE, WHEN("Written")] },
    { name: "Gratitude", collection: "soul_gratitude", noun: "something you are grateful for",
      hint: "Kept as a record, never turned into a score.",
      fields: [NOTE, WHEN()] },
    { name: "Principles", collection: "soul_principles", noun: "a principle",
      hint: "What you want to hold to, written down where you can see it.",
      fields: [NOTE] },
  ],
  mind: [
    { name: "Focus sessions", collection: "mind_sessions", noun: "a session",
      hint: "What you worked on, and for how long.",
      fields: [{ key: "minutes", label: "Minutes", type: "number" }, WHEN(), NOTE] },
    { name: "Journal", collection: "mind_journal", noun: "an entry",
      hint: "Reflection with a date and context.",
      fields: [NOTE, WHEN("Written")] },
  ],
  body: [
    { name: "Training", collection: "body_training", noun: "a session",
      hint: "What you did, and how it went.",
      fields: [{ key: "minutes", label: "Minutes", type: "number" }, WHEN(), NOTE] },
    { name: "Nutrition", collection: "body_nutrition", noun: "a meal or note",
      hint: "Meals and observations, in your own words.",
      fields: [WHEN(), NOTE] },
    { name: "Sleep", collection: "body_sleep", noun: "a night",
      hint: "Hours slept, and anything worth remembering about it.",
      fields: [{ key: "hours", label: "Hours", type: "number" }, WHEN("Night of"), NOTE] },
  ],
  contacts: [
    { name: "People", collection: "contacts_people", noun: "a person",
      hint: "Who they are and how to reach them.",
      fields: [
        { key: "relationship", label: "Relationship", type: "text" },
        { key: "contact", label: "Phone or email", type: "text" },
        NOTE,
      ] },
    { name: "Important dates", collection: "contacts_dates", noun: "a date",
      hint: "Birthdays and occasions you intend to remember.",
      fields: [WHEN(), NOTE] },
    { name: "Follow-ups", collection: "contacts_followups", noun: "a follow-up",
      hint: "Conversations that need a next step.",
      fields: [STATUS("open", "done"), WHEN("By"), NOTE] },
  ],
  "nature-universe": [
    { name: "Observations", collection: "nature_observations", noun: "an observation",
      hint: "What you saw, when, and where.",
      fields: [WHEN(), NOTE, SOURCE] },
    { name: "Questions", collection: "nature_questions", noun: "a question",
      hint: "Things you want to understand.",
      fields: [STATUS("open", "answered"), NOTE] },
  ],
  "peace-mode": [
    { name: "Sessions", collection: "peace_sessions", noun: "a session",
      hint: "Quiet time you chose to record.",
      fields: [{ key: "minutes", label: "Minutes", type: "number" }, WHEN(), NOTE] },
  ],

  /* ---- Education -------------------------------------------------------- */
  college: [
    { name: "Subjects", collection: "college_subjects", noun: "a subject",
      hint: "Modules and units for this semester.",
      fields: [{ key: "code", label: "Code", type: "text" }, NOTE] },
    { name: "Exams", collection: "college_exams", noun: "an exam",
      hint: "Dates, and how preparation is going.",
      fields: [WHEN("Date"), STATUS("upcoming", "sat", "passed"), NOTE] },
    { name: "Notes", collection: "college_notes", noun: "a note",
      hint: "Study notes, kept beside their subject.",
      fields: [{ key: "subject", label: "Subject", type: "text" }, NOTE] },
  ],
  academy: [
    { name: "Paths", collection: "academy_paths", noun: "a learning path",
      hint: "A skill you are deliberately building.",
      fields: [STATUS("planned", "in progress", "done"), NOTE] },
    { name: "Lessons", collection: "academy_lessons", noun: "a lesson",
      hint: "What you learned, and where it came from.",
      fields: [SOURCE, WHEN("Studied"), NOTE] },
  ],
  "formula-engine": [
    { name: "Formulas", collection: "formula_library", noun: "a formula",
      hint: "The expression, its units, and what it is for.",
      fields: [
        { key: "expression", label: "Expression", type: "text" },
        { key: "units", label: "Units", type: "text" },
        NOTE, SOURCE,
      ] },
  ],
  "logic-lab": [
    { name: "Challenges", collection: "logic_challenges", noun: "a challenge",
      hint: "Problems worked, and what you got wrong.",
      fields: [STATUS("to do", "solved", "review"), NOTE, SOURCE] },
  ],
  "learning-vault": [
    { name: "Library", collection: "vault_library", noun: "a book or course",
      hint: "What you are reading, watching or working through.",
      fields: [
        { key: "kind", label: "Kind", type: "choice", choices: ["book", "course", "paper", "video"] },
        STATUS("to read", "reading", "finished"),
        SOURCE, NOTE,
      ] },
    { name: "Flashcards", collection: "vault_cards", noun: "a card",
      hint: "The prompt on the front; the answer in the detail.",
      fields: [NOTE] },
  ],

  /* ---- Money & work ----------------------------------------------------- */
  finance: [
    { name: "Accounts", collection: "finance_accounts", noun: "an account",
      hint: "Balances you enter yourself. NN connects to no bank.",
      fields: [AMOUNT("Balance"), { key: "currency", label: "Currency", type: "text" }, NOTE] },
    { name: "Transactions", collection: "finance_transactions", noun: "a transaction",
      hint: "Money in is positive, money out is negative.",
      fields: [AMOUNT(), WHEN(), { key: "category", label: "Category", type: "text" }, NOTE] },
    { name: "Budgets", collection: "finance_budgets", noun: "a budget",
      hint: "What you intend to spend, by category.",
      fields: [AMOUNT("Limit"), { key: "category", label: "Category", type: "text" }, NOTE] },
  ],
  invest: [
    { name: "Watchlist", collection: "invest_watchlist", noun: "a holding to watch",
      hint: "Assets you are researching. No prices are fetched.",
      fields: [{ key: "ticker", label: "Ticker", type: "text" }, NOTE, SOURCE] },
    { name: "Holdings", collection: "invest_holdings", noun: "a holding",
      hint: "What you own, entered by you.",
      fields: [
        { key: "ticker", label: "Ticker", type: "text" },
        { key: "units", label: "Units", type: "number" },
        AMOUNT("Cost basis"), NOTE,
      ] },
  ],
  business: [
    { name: "Ventures", collection: "business_ventures", noun: "a venture",
      hint: "What it is, and where it stands.",
      fields: [STATUS("idea", "validating", "running", "closed"), NOTE] },
    { name: "Decisions", collection: "business_decisions", noun: "a decision",
      hint: "The options, the choice, and why.",
      fields: [WHEN("Decided"), NOTE] },
  ],
  freelance: [
    { name: "Clients", collection: "freelance_clients", noun: "a client",
      hint: "Who they are and what you do for them.",
      fields: [{ key: "contact", label: "Contact", type: "text" }, NOTE] },
    { name: "Deliverables", collection: "freelance_deliverables", noun: "a deliverable",
      hint: "Work agreed, and whether it has shipped.",
      fields: [STATUS("agreed", "in progress", "delivered"), WHEN("Due"), NOTE] },
    { name: "Invoices", collection: "freelance_invoices", noun: "an invoice",
      hint: "What you billed, and whether it was paid.",
      fields: [AMOUNT(), STATUS("draft", "sent", "paid"), WHEN("Issued"), NOTE] },
  ],
  career: [
    { name: "Skills", collection: "career_skills", noun: "a skill",
      hint: "What you can do, and the evidence for it.",
      fields: [STATUS("learning", "working", "strong"), NOTE] },
    { name: "Interviews", collection: "career_interviews", noun: "an interview",
      hint: "Where, when, and what you took from it.",
      fields: [WHEN(), NOTE] },
  ],
  projects: [
    { name: "Projects", collection: "projects_projects", noun: "a project",
      hint: "Scope, status and who owns it.",
      fields: [STATUS("planned", "active", "blocked", "done"), NOTE] },
    { name: "Milestones", collection: "projects_milestones", noun: "a milestone",
      hint: "A checkpoint you can actually verify.",
      fields: [STATUS("open", "reached"), WHEN("Target"), NOTE] },
  ],
  achievements: [
    { name: "Achievements", collection: "achievements_items", noun: "an achievement",
      hint: "Something finished, with proof.",
      fields: [WHEN("Achieved"), SOURCE, NOTE] },
  ],

  /* ---- Creation & communication ----------------------------------------- */
  "creator-studio": [
    { name: "Content", collection: "creator_content", noun: "a piece",
      hint: "From idea to published.",
      fields: [STATUS("idea", "making", "editing", "published"), WHEN("Planned"), NOTE] },
  ],
  studio: [
    { name: "Documents", collection: "studio_documents", noun: "a document",
      hint: "Long-form writing, drafted here.",
      fields: [STATUS("draft", "revising", "final"), NOTE] },
  ],
  mail: [
    { name: "Drafts", collection: "mail_drafts", noun: "a draft",
      hint: "Messages prepared for your review. NN sends nothing.",
      fields: [{ key: "to", label: "To", type: "text" }, NOTE] },
    { name: "Follow-ups", collection: "mail_followups", noun: "a follow-up",
      hint: "Conversations still waiting on a reply.",
      fields: [STATUS("waiting", "replied", "closed"), WHEN("Since"), NOTE] },
  ],
  english: [
    { name: "Vocabulary", collection: "english_vocabulary", noun: "a word",
      hint: "The word, what it means, and a sentence using it.",
      fields: [{ key: "meaning", label: "Meaning", type: "text" }, NOTE] },
    { name: "Practice", collection: "english_practice", noun: "a practice session",
      hint: "What you practised and how it went.",
      fields: [
        { key: "skill", label: "Skill", type: "choice", choices: ["speaking", "listening", "writing", "grammar"] },
        WHEN(), NOTE,
      ] },
  ],

  /* ---- Knowledge & insight ---------------------------------------------- */
  memory: [
    { name: "Knowledge", collection: "memory_facts", noun: "something to remember",
      hint: "A fact, and where it came from. Both, or neither.",
      fields: [SOURCE, NOTE] },
  ],
  "life-archive": [
    { name: "Milestones", collection: "archive_milestones", noun: "a milestone",
      hint: "Moments worth keeping, in order.",
      fields: [WHEN("Happened"), NOTE] },
  ],
  analytics: [
    { name: "Measures", collection: "analytics_measures", noun: "a measure",
      hint: "Something you track yourself, with its number and date.",
      fields: [{ key: "value", label: "Value", type: "number" }, WHEN(), SOURCE, NOTE] },
  ],
  travel: [
    { name: "Trips", collection: "travel_trips", noun: "a trip",
      hint: "Where, when, and how it is coming along.",
      fields: [WHEN("Departs"), STATUS("idea", "booked", "travelling", "back"), NOTE] },
    { name: "Places", collection: "travel_places", noun: "a place",
      hint: "Somewhere worth going, with why.",
      fields: [NOTE, SOURCE] },
  ],
  simulator: [
    { name: "Scenarios", collection: "simulator_scenarios", noun: "a scenario",
      hint: "A what-if, with its assumptions written down.",
      fields: [NOTE] },
  ],

  /* ---- System ------------------------------------------------------------ */
  "command-centre": [
    { name: "Requests", collection: "command_requests", noun: "a request",
      hint: "What you asked NN for, and what happened.",
      fields: [STATUS("asked", "done", "refused"), WHEN(), NOTE] },
  ],
  "automation-studio": [
    { name: "Automations", collection: "automation_rules", noun: "an automation",
      hint: "Written down here. NN does not run them yet, and says so.",
      fields: [STATUS("draft", "approved", "paused"), NOTE] },
  ],
  "security-centre": [
    { name: "Devices", collection: "security_devices", noun: "a device",
      hint: "Devices you have registered a passkey on.",
      fields: [WHEN("Registered"), NOTE] },
  ],
  "control-room": [
    { name: "Checks", collection: "control_checks", noun: "a check",
      hint: "Things about NN you want to keep an eye on.",
      fields: [STATUS("ok", "watching", "broken"), WHEN("Checked"), NOTE] },
  ],
};

/** Every collection any application reads or writes. */
export function allSectionCollections(): readonly string[] {
  return Object.values(APP_SECTIONS).flatMap((sections) => sections.map((s) => s.collection));
}
