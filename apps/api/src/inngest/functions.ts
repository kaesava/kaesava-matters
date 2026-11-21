import { inngest } from "./client.js";
import {
  createNotificationFunctions,
  createRetentionWorkflows,
} from "@money-matters/capability-notifications";
import { createWeeklyDigestWorkflow } from "./workflows/weekly-digest.workflow.js";
import { createPaydayAlertWorkflow } from "./workflows/payday-alert.workflow.js";
import { createBillAlertWorkflow } from "./workflows/bill-alert.workflow.js";

export { maintainRollingWindowWorkflow } from "./budgeting-workflows.js";
export const notificationFunctions = createNotificationFunctions(inngest);
export const scheduledNotificationFunctions = [
  createWeeklyDigestWorkflow(inngest),
  createPaydayAlertWorkflow(inngest),
  createBillAlertWorkflow(inngest),
];
export const retentionWorkflows = createRetentionWorkflows(inngest);
