import { submitFeedbackCommand, SubmitFeedbackInputSchema } from "../submit-feedback.command";

export const bugReportsProcedures = {
  submitFeedback: {
    input: SubmitFeedbackInputSchema,
    execute: submitFeedbackCommand,
  },
} as const;
