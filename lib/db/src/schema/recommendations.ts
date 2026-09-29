import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { assessmentsTable } from "./assessments";

export const recommendationsTable = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessmentsTable.assessmentId, { onDelete: "cascade" }),
  recommendationId: text("recommendation_id").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  priority: text("priority").notNull(),
});