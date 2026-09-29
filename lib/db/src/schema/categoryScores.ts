import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { assessmentsTable } from "./assessments";

export const categoryScoresTable = pgTable("category_scores", {
  id: serial("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessmentsTable.assessmentId, { onDelete: "cascade" }),
  category: text("category").notNull(),
  score: integer("score").notNull(),
  label: text("label").notNull(),
});