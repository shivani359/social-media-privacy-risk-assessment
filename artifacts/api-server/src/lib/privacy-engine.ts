import type { AssessmentInput } from "@workspace/api-zod";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type Priority = "immediate" | "important" | "good_practice";

export type CategoryScore = {
  category: string;
  score: number;
  label: string;
};

export type Finding = {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: Priority;
};

export type Recommendation = {
  id: string;
  title: string;
  detail: string;
  priority: Priority;
};

const categoryNames = [
  "Profile exposure",
  "Personal information",
  "Location exposure",
  "Content exposure",
  "Connections",
  "Tagging",
  "Account security",
  "Third-party apps",
  "Social engineering",
  "Digital footprint",
] as const;

const levelForScore = (score: number): RiskLevel => {
  if (score <= 20) return "LOW";
  if (score <= 40) return "MODERATE";
  if (score <= 70) return "HIGH";
  return "CRITICAL";
};

const labelForScore = (score: number): string => {
  if (score <= 20) return "Lower exposure";
  if (score <= 40) return "Watch list";
  if (score <= 70) return "High exposure";
  return "Critical exposure";
};

const average = (values: number[]) =>
  Math.round(values.reduce((total, value) => total + value, 0) / values.length);

const visibilityRisk = (value: "public" | "friends" | "private") =>
  value === "public" ? 100 : value === "friends" ? 45 : 5;

const yesRisk = (value: boolean) => (value ? 100 : 0);
const noControlRisk = (value: boolean) => (value ? 0 : 100);
const awarenessRisk = (value: "high" | "medium" | "low") =>
  value === "low" ? 100 : value === "medium" ? 50 : 0;
const connectionRisk = (value: "often" | "sometimes" | "rarely") =>
  value === "often" ? 100 : value === "sometimes" ? 55 : 10;

export function extractPrivacyFeatures(input: AssessmentInput) {
  return {
    profile: [
      visibilityRisk(input.profileVisibility),
      yesRisk(input.searchEngineVisibility),
      visibilityRisk(input.followersVisibility),
      visibilityRisk(input.friendsListVisibility),
    ],
    personal: [
      yesRisk(input.phonePublic),
      yesRisk(input.emailPublic),
      yesRisk(input.birthdayPublic),
      yesRisk(input.homeInfoPublic),
      yesRisk(input.workplacePublic),
      yesRisk(input.educationPublic),
      yesRisk(input.relationshipPublic),
    ],
    location: [
      yesRisk(input.realTimeLocation),
      yesRisk(input.geotagging),
      yesRisk(input.checkIns),
      yesRisk(input.homeLocationExposure),
      yesRisk(input.workLocationExposure),
      yesRisk(input.travelPlans),
      yesRisk(input.frequentLocationPatterns),
    ],
    content: [
      visibilityRisk(input.postsVisibility),
      noControlRisk(input.historicalPostsReviewed),
      noControlRisk(input.photoMetadataAware),
      yesRisk(input.photoDocumentExposure),
    ],
    connections: [
      connectionRisk(input.unknownConnections),
      noControlRisk(input.friendFollowerReview),
    ],
    tagging: [
      noControlRisk(input.tagReviewEnabled),
      yesRisk(input.anyoneCanTag),
      yesRisk(input.autoTaggedPosts),
      yesRisk(input.unknownMentions),
    ],
    account: [
      noControlRisk(input.mfaEnabled),
      noControlRisk(input.uniquePassword),
      noControlRisk(input.passwordManagerUsed),
      noControlRisk(input.loginAlertsEnabled),
      noControlRisk(input.recoveryInfoReviewed),
      noControlRisk(input.activeSessionsReviewed),
      noControlRisk(input.unknownDevicesChecked),
    ],
    apps: [
      noControlRisk(input.thirdPartyAppsReviewed),
      yesRisk(input.unusedAppsPresent),
      yesRisk(input.unnecessaryPermissions),
    ],
    social: [
      awarenessRisk(input.suspiciousLinksAwareness),
      yesRisk(input.verificationCodesShared),
      yesRisk(input.personalInfoInMessages),
      awarenessRisk(input.impersonationAwareness),
      yesRisk(input.suspiciousGiveaways),
    ],
    footprint: [
      noControlRisk(input.oldAccountsReviewed),
      noControlRisk(input.publicCommentsReviewed),
      noControlRisk(input.privacySettingsReviewed),
      noControlRisk(input.historicalPostsReviewed),
    ],
  };
}

export function calculateCategoryScores(input: AssessmentInput): CategoryScore[] {
  const features = extractPrivacyFeatures(input);
  const values = [
    average(features.profile),
    average(features.personal),
    average(features.location),
    average(features.content),
    average(features.connections),
    average(features.tagging),
    average(features.account),
    average(features.apps),
    average(features.social),
    average(features.footprint),
  ];

  return categoryNames.map((category, index) => ({
    category,
    score: values[index],
    label: labelForScore(values[index]),
  }));
}

const weightedCategories = [
  0.1, 0.15, 0.15, 0.1, 0.1, 0.05, 0.15, 0.05, 0.1, 0.05,
];

export function calculatePrivacyRisk(input: AssessmentInput) {
  const categoryScores = calculateCategoryScores(input);
  const overallScore = Math.round(
    categoryScores.reduce(
      (total, item, index) => total + item.score * weightedCategories[index],
      0,
    ),
  );
  const controlsEnabled = [
    input.mfaEnabled,
    input.uniquePassword,
    input.passwordManagerUsed,
    input.loginAlertsEnabled,
    input.tagReviewEnabled,
    input.thirdPartyAppsReviewed,
    input.privacySettingsReviewed,
  ].filter(Boolean).length;

  return {
    categoryScores,
    overallScore,
    riskLevel: levelForScore(overallScore),
    controlsEnabled,
    highRiskCategories: categoryScores.filter((item) => item.score > 70).length,
  };
}

type FindingRule = {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: Priority;
  when: (input: AssessmentInput) => boolean;
};

const findingRules: FindingRule[] = [
  {
    id: "public-contact",
    category: "Personal information",
    title: "Contact details may be visible to a broad audience",
    description: "Public phone or email visibility can make impersonation and unwanted contact easier.",
    priority: "immediate",
    when: (input) => input.phonePublic || input.emailPublic,
  },
  {
    id: "location-broadcast",
    category: "Location exposure",
    title: "Location signals are being shared",
    description: "Real-time locations, check-ins, travel plans, and geotags can reveal routines or when a place is occupied.",
    priority: "immediate",
    when: (input) =>
      input.realTimeLocation ||
      input.checkIns ||
      input.travelPlans ||
      input.homeLocationExposure ||
      input.geotagging,
  },
  {
    id: "weak-authentication",
    category: "Account security",
    title: "Account hardening controls need attention",
    description: "Missing MFA, login alerts, or session reviews can increase account-takeover exposure.",
    priority: "immediate",
    when: (input) =>
      !input.mfaEnabled || !input.loginAlertsEnabled || !input.activeSessionsReviewed,
  },
  {
    id: "unknown-connections",
    category: "Connections",
    title: "Unknown connection requests are accepted",
    description: "Unfamiliar accounts can use public context to make social-engineering attempts more convincing.",
    priority: "important",
    when: (input) => input.unknownConnections !== "rarely",
  },
  {
    id: "tagging",
    category: "Tagging",
    title: "Tag review is not fully enabled",
    description: "Other people can add context about you even when you post very little yourself.",
    priority: "important",
    when: (input) => !input.tagReviewEnabled || input.anyoneCanTag || input.autoTaggedPosts,
  },
  {
    id: "third-party-access",
    category: "Third-party apps",
    title: "Connected app access has not been reviewed",
    description: "Unused integrations and broad permissions increase the number of services that can access account data.",
    priority: "important",
    when: (input) => !input.thirdPartyAppsReviewed || input.unusedAppsPresent || input.unnecessaryPermissions,
  },
  {
    id: "historical-content",
    category: "Digital footprint",
    title: "Older public content may be overdue for review",
    description: "Historical posts, comments, and old accounts can preserve more context than you intend to share today.",
    priority: "good_practice",
    when: (input) => !input.historicalPostsReviewed || !input.publicCommentsReviewed || !input.oldAccountsReviewed,
  },
  {
    id: "photo-context",
    category: "Content exposure",
    title: "Photos may reveal more context than expected",
    description: "Badges, documents, screens, vehicle details, and metadata can expose information accidentally.",
    priority: "important",
    when: (input) => !input.photoMetadataAware || input.photoDocumentExposure,
  },
  {
    id: "social-engineering",
    category: "Social engineering",
    title: "Message and impersonation awareness can improve",
    description: "Unexpected links, verification-code requests, and lookalike accounts deserve an independent check.",
    priority: "important",
    when: (input) =>
      input.suspiciousLinksAwareness !== "high" ||
      input.impersonationAwareness !== "high" ||
      input.verificationCodesShared,
  },
];

export function generatePrivacyFindings(input: AssessmentInput): Finding[] {
  return findingRules.filter((rule) => rule.when(input)).map((rule) => ({
    id: rule.id,
    category: rule.category,
    title: rule.title,
    description: rule.description,
    severity: rule.priority,
  }));
}

const recommendationText: Record<string, { title: string; detail: string }> = {
  "public-contact": {
    title: "Limit contact-information visibility",
    detail: "Keep phone and personal email visibility limited to the smallest audience needed.",
  },
  "location-broadcast": {
    title: "Reduce real-time location sharing",
    detail: "Avoid broadcasting current locations and travel plans; consider sharing after leaving a place.",
  },
  "weak-authentication": {
    title: "Enable stronger account controls",
    detail: "Turn on MFA, login alerts, and regular active-session reviews where the platform supports them.",
  },
  "unknown-connections": {
    title: "Verify unfamiliar connections",
    detail: "Treat unexpected requests and DMs as untrusted until independently verified.",
  },
  tagging: {
    title: "Review tags and mentions before they appear",
    detail: "Enable tag review and narrow who can tag or mention you.",
  },
  "third-party-access": {
    title: "Review connected apps",
    detail: "Remove unused integrations and narrow permissions using least privilege.",
  },
  "historical-content": {
    title: "Schedule a digital-footprint review",
    detail: "Review old posts, comments, and unused accounts on a recurring schedule.",
  },
  "photo-context": {
    title: "Check photos before posting",
    detail: "Look for documents, badges, screens, location cues, and metadata before sharing.",
  },
  "social-engineering": {
    title: "Pause on unexpected messages",
    detail: "Never share verification codes and verify links, giveaways, and impersonated accounts through a separate channel.",
  },
};

export function generateRecommendations(input: AssessmentInput): Recommendation[] {
  return generatePrivacyFindings(input).map((finding) => ({
    id: finding.id,
    title: recommendationText[finding.id].title,
    detail: recommendationText[finding.id].detail,
    priority: finding.severity,
  }));
}

export function buildAssessment(input: AssessmentInput) {
  const risk = calculatePrivacyRisk(input);
  return {
    ...risk,
    findings: generatePrivacyFindings(input),
    recommendations: generateRecommendations(input),
  };
}

export function applyImprovements(
  input: AssessmentInput,
  improvements: string[],
): AssessmentInput {
  const next = { ...input };
  if (improvements.includes("makeContactPrivate")) {
    next.phonePublic = false;
    next.emailPublic = false;
  }
  if (improvements.includes("reduceLocationSharing")) {
    next.realTimeLocation = false;
    next.geotagging = false;
    next.checkIns = false;
    next.travelPlans = false;
    next.homeLocationExposure = false;
    next.workLocationExposure = false;
    next.frequentLocationPatterns = false;
  }
  if (improvements.includes("enableMfa")) {
    next.mfaEnabled = true;
    next.loginAlertsEnabled = true;
  }
  if (improvements.includes("enableTagReview")) {
    next.tagReviewEnabled = true;
    next.anyoneCanTag = false;
    next.autoTaggedPosts = false;
  }
  if (improvements.includes("reviewThirdPartyApps")) {
    next.thirdPartyAppsReviewed = true;
    next.unusedAppsPresent = false;
    next.unnecessaryPermissions = false;
  }
  if (improvements.includes("reviewHistoricalPosts")) {
    next.historicalPostsReviewed = true;
    next.publicCommentsReviewed = true;
    next.oldAccountsReviewed = true;
  }
  if (improvements.includes("reviewPrivacySettings")) {
    next.privacySettingsReviewed = true;
  }
  if (improvements.includes("rejectUnknownConnections")) {
    next.unknownConnections = "rarely";
  }
  return next;
}

export const checklistItems = [
  ["visibility", "Review profile and post visibility", "Profile exposure"],
  ["contact", "Hide unnecessary contact information", "Personal information"],
  ["birthday", "Review birth-date visibility", "Personal information"],
  ["location", "Reduce real-time location and travel sharing", "Location privacy"],
  ["tags", "Review tagging and mention permissions", "Tagging"],
  ["connections", "Verify unfamiliar followers and requests", "Connections"],
  ["mfa", "Enable MFA and login alerts", "Account security"],
  ["sessions", "Review active sessions and unknown devices", "Account security"],
  ["apps", "Remove unused connected apps", "Third-party apps"],
  ["history", "Review old public posts and comments", "Digital footprint"],
  ["photos", "Check photos for documents and metadata", "Content exposure"],
  ["messages", "Never share verification codes", "Social engineering"],
].map(([id, label, category]) => ({ id, label, category }));
