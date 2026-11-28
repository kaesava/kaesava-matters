import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmJobs } from "./tm_job.js";
import { tmInvoices } from "./tm_invoice.js";
import { tmCustomers } from "./tm_customer.js";

/**
 * Customer satisfaction & Google Business Review booster request.
 */
export const tmReviewRequests = pgTable("tm_review_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id").references(() => tmJobs.id),
  invoiceId: uuid("invoice_id").references(() => tmInvoices.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => tmCustomers.id),
  googleReviewUrl: text("google_review_url"),
  ratingScore: integer("rating_score"),
  redirectedToGoogleAt: timestamp("redirected_to_google_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  ...tenantAndTimestamps,
});
