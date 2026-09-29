import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const assessmentsTable = pgTable("assessments", {
  assessmentId: text("assessment_id").primaryKey(),
  overallScore: integer("overall_score").notNull(),
  riskLevel: text("risk_level").notNull(),
  controlsEnabled: integer("controls_enabled").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AssessmentRow = typeof assessmentsTable.$inferSelect;