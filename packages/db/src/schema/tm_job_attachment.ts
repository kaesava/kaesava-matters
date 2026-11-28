import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmJobs } from "./tm_job.js";
import { tmJobVisits } from "./tm_job_visit.js";
import { fileNotes } from "./file_note.js";

/**
 * Categorized job photo or document attachment linking a Ring 2 file_notes record.
 */
export const tmJobAttachments = pgTable("tm_job_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => tmJobs.id),
  visitId: uuid("visit_id").references(() => tmJobVisits.id),
  fileNoteId: uuid("file_note_id")
    .notNull()
    .references(() => fileNotes.id),
  photoCategory: varchar("photo_category", { length: 32 }).notNull().default("PROGRESS"),
  visibility: varchar("visibility", { length: 32 }).notNull().default("INTERNAL"),
  caption: varchar("caption", { length: 500 }),
  ...tenantAndTimestamps,
});
