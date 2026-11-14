import { inngest } from "./client.js";

import { createNotificationFunctions, createScheduledNotificationFunctions, createRetentionWorkflows } from "@money-matters/capability-notifications";
export { maintainRollingWindowWorkflow } from "./budgeting-workflows.js";
export const notificationFunctions = createNotificationFunctions(inngest);
export const scheduledNotificationFunctions = createScheduledNotificationFunctions(inngest);
export const retentionWorkflows = createRetentionWorkflows(inngest);

