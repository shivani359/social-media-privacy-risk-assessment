import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { assessmentsTable } from "./assessments";

export const findingsTable = pgTable("findings", {
  id: serial("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessmentsTable.assessmentId, { onDelete: "cascade" }),
  findingId: text("finding_id").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
});