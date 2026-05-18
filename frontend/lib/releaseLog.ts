export const RELEASE_LOG = [
  {
    version: "0.9.0",
    date: "2026-05-18",
    title: "Stitch-inspired command shell",
    items: [
      "Updated the app shell with a calm pastel command rail inspired by the Google Stitch direction.",
      "Reworked navigation around Home, Planning, Coach and Domains.",
      "Added a persistent AI Coach prompt and Quick Action entry point to the desktop rail.",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-05-18",
    title: "Custom areas and useful nudges",
    items: [
      "Added active/hidden controls for each LifeOS area.",
      "Added per-area labels, outcomes and personal nudge wording.",
      "Added a nudge generator that turns open tasks, inbox items and upcoming plans into useful reminders.",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-05-17",
    title: "Material You LifeOS direction",
    items: [
      "Applied the bright LifeOS Material You theme.",
      "Rebuilt onboarding around one simple operating flow.",
      "Added Life Inbox visibility to the dashboard.",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-05-17",
    title: "Unified life inbox and integrations",
    items: [
      "Added Capture, Decide, Act as the core LifeOS model.",
      "Added foundations for email and calendar ingestion.",
      "Connected inbox context to homescreen and AI memory.",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-05-17",
    title: "Second brain foundations",
    items: [
      "Added knowledge items, learning resources, decisions and life reviews.",
      "Added API tests for the second brain layer.",
      "Extended AI context with learning, knowledge and review signals.",
    ],
  },
] as const;
