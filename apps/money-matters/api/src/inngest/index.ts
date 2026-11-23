import {
  maintainRollingWindowWorkflow,
  notificationFunctions,
  scheduledNotificationFunctions,
  retentionWorkflows,
} from "./functions.js";

export const functions = [
  maintainRollingWindowWorkflow,
  ...notificationFunctions,
  ...scheduledNotificationFunctions,
  ...retentionWorkflows,
];


