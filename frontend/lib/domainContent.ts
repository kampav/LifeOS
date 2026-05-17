export const DOMAIN_CONTENT: Record<string, {
  outcome: string;
  everyday: string[];
  suggestedCaptures: string[];
  nudge: string;
}> = {
  health: {
    outcome: "Feel well enough to do the life you are planning.",
    everyday: ["Appointments", "Medication", "Sleep", "Movement", "Nutrition"],
    suggestedCaptures: ["Log symptom", "Book appointment", "Track workout", "Record meal"],
    nudge: "Choose one health action that removes future friction.",
  },
  family: {
    outcome: "Keep the people closest to you visible and cared for.",
    everyday: ["School dates", "Birthdays", "Shared plans", "Family moments", "Admin"],
    suggestedCaptures: ["Add family date", "Plan weekend", "Capture memory", "Create reminder"],
    nudge: "One small family touchpoint today is enough.",
  },
  finance: {
    outcome: "Know where money is going and what future it is building.",
    everyday: ["Spending", "Budgets", "Assets", "Tax dates", "Big decisions"],
    suggestedCaptures: ["Log spend", "Review budget", "Add asset", "Capture tax note"],
    nudge: "Review the one number that would change your next decision.",
  },
  career: {
    outcome: "Turn work into visible progress, evidence and options.",
    everyday: ["Achievements", "Stakeholders", "Skills", "Feedback", "Next moves"],
    suggestedCaptures: ["Log achievement", "Add feedback", "Plan stakeholder", "Track skill"],
    nudge: "Capture one proof point future-you can reuse.",
  },
  growth: {
    outcome: "Build capability through small repeatable investments.",
    everyday: ["Books", "Courses", "Habits", "Reflection", "Practice"],
    suggestedCaptures: ["Save takeaway", "Log practice", "Add learning", "Create habit"],
    nudge: "Apply one thing you already learned before collecting more.",
  },
  social: {
    outcome: "Maintain relationships without relying on memory alone.",
    everyday: ["Check-ins", "Events", "Friends", "Energy", "Follow-ups"],
    suggestedCaptures: ["Log catch-up", "Plan message", "Add event", "Remember detail"],
    nudge: "Reach out where the relationship matters but has gone quiet.",
  },
  education: {
    outcome: "Convert learning inputs into retained knowledge.",
    everyday: ["Books", "Courses", "Notes", "Certificates", "Projects"],
    suggestedCaptures: ["Add course", "Save note", "Track reading", "Plan project"],
    nudge: "Turn one learning item into an action or note.",
  },
  property: {
    outcome: "Keep home, assets and property admin under control.",
    everyday: ["Maintenance", "Insurance", "Documents", "Valuations", "Repairs"],
    suggestedCaptures: ["Add repair", "Store document", "Set renewal", "Track valuation"],
    nudge: "Capture the next property admin item before it becomes urgent.",
  },
  holiday: {
    outcome: "Plan travel with less admin and more anticipation.",
    everyday: ["Trips", "Ideas", "Bookings", "Visas", "Memories"],
    suggestedCaptures: ["Add trip", "Save place", "Track booking", "Capture memory"],
    nudge: "Move one travel idea closer to a real plan.",
  },
  community: {
    outcome: "Make contribution intentional rather than accidental.",
    everyday: ["Volunteering", "Causes", "Events", "Donations", "Networks"],
    suggestedCaptures: ["Log hours", "Save cause", "Plan event", "Add donation"],
    nudge: "Choose one contribution that fits the life you are building.",
  },
};
