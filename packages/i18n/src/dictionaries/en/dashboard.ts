export const dashboard = {
  "dashboard": {
    "title": "Home",
    "quickAction": "+ Quick Action",
    "recordExpense": "Record Bill or Goal Spend",
    "recordIncome": "Record Income",
    "moveMoney": "Move Money",
    "transferBetweenEnvelopes": "Transfer between Envelopes",
    "loading": "Loading...",
    "deleteIncomeTitle": "Delete Income",
    "upcoming": {
      "healthOnTrack": "On Track",
      "healthNeedsAttention": "Needs Attention",
      "healthBehind": "Behind"
    },
    "hero": {
      "everydayEnvelopeTitle": "Everyday Envelope",
      "safeToSpendLabel": "Safe to Spend Right Now",
      "alignBalance": "Sync Balance",
      "alignBalanceTooltip": "Sync this account with your actual bank balance",
      "bufferDippedBadge": "Buffer dipped",
      "headsUpBufferTooltip": "Your Everyday balance ({balance}) is below your {buffer} safety buffer.",
      "currentBalanceLabel": "Current balance: {amount}",
      "dueToday": "Payday today! 🎉",
      "bufferProtected": "{amount} buffer protected",
      "bufferDipped": "Balance dipped below {amount} buffer",
      "everydayAllowanceCycle": "Target Allowance: {amount}",
      "estRemaining": "~{pace}/day · {days}d to payday",
      "estRemainingToday": "Payday is today!",
      "estRemainingNoPayday": "~{pace}/day · 14-day window",
      "billsEnvelopeTitle": "Bills Envelope",
      "billsRingFencedSubtitle": "Ring-fenced for committed bills",
      "billsFullyCovered": "Next 14 days of bills are fully covered!",
      "billsPaydayCovered": "Bills due before next payday are fully covered!",
      "noBillsDuePayday": "No bills due before next payday.",
      "noBillsDue14Days": "No bills due in the next 14 days.",
      "targetMonthlyBills": "Target Monthly Bills: {amount}",
      "targetMonthlyBillsLabel": "Target Monthly Bills",
      "coverShortfall": "Cover →",
      "shortfallOf": "Shortfall of {amount} in due bill envelopes",
      "billsDueSummary": "{count} bill(s) totaling {amount} due in 14 days",
      "billsDuePaydaySummary": "{count} bill(s) totaling {amount} due before next payday",
      "firstPaydayPendingBadge": "Awaiting First Payday",
      "firstPaydayBillsNotice": "Bills will be funded automatically once your first payday is planned.",
      "balanceMatchNudgeTitle": "Balance sync overdue",
      "balanceMatchNudgeDesc": "It's been over 14 days since your last bank balance sync. Sync now to keep your everyday safe-to-spend accurate.",
      "balanceMatchNudgeAction": "Sync Balance"
    },
    "attention": {
      "categoryFunded": "Covered ✓",
      "categoryShort": "Short by {amount}"
    },
    "goals": {
      "title": "Goals",
      "cardTitle": "Goals",
      "totalSavedInvested": "Total Saved & Invested",
      "milestonesFunded": "{funded} of {target} ({percent}%)",
      "recurringPace": "{amount}/mo recurring pace",
      "goalBreakdown": "{total} Goals · {targetCount} Target Date, {recurringCount} Recurring",
      "noGoalsSubtitle": "Create a goal to start building your savings.",
      "addGoalAction": "+ Add Goal",
      "onTrack": "{count} of {total} on track",
      "allOnTrack": "All {total} goals on track",
      "viewAll": "View All Goals",
      "ongoingPill": "Ongoing",
    },
    "upcomingExpensesTransfers": {
      "title": "Upcoming Expenses & Transfers",
      "empty": "✨ All caught up! All bills are covered until your next payday.",
      "daysAway": "{count} day{plural} away",
      "daysOverdue": "{count} day{plural} overdue",
      "dueToday": "Due today!",
      "availableSuffix": "· {amount} available"
    },
    "nextPay": {
      "reviewSplits": "Review and edit plan",
      "upcomingIncome": "Upcoming Income",
      "upcomingIncomeWithCount": "Upcoming Income ({count})",
      "noUpcoming": "No upcoming paydays scheduled.",
      "upcomingEventsLink": "Upcoming Events →",
      "twelveMonthPlanLink": "12-Month Plan →",
      "nextPaydayBadge": "Next Payday",
      "allocatePayday": "Plan Payday",
      "savedBadge": "Draft Saved"
    }
  },
  "home": {
    "deleteTransferTitle": "Delete Scheduled Transfer",
    "deleteTransferMessage": "Are you sure you want to delete this scheduled transfer?"
  },
  "cards": {
    "paydayTransfer": {
      "badge": "1-Tap Payday Transfer Plan",
      "sourceAccountDefault": "Paycheck Account",
      "destAccountDefault": "External Account",
      "rollupDescription": "Bank transfers are rolled up by destination account so you only make 1 transfer per bank:",
      "allRetainedDescription": "All allocations remain in your source account. No external bank transfers needed!",
      "retainedTitle": "Retained in",
      "noTransferNeeded": "No transfer required — funds stay in this account for:",
      "transfersRequired": "Required Transfers",
      "copyTooltip": "Copy amount to clipboard for banking app",
      "coversEnvelopes": "Covers {count} envelopes: ",
      "singleAccountProTipTitle": "💡 Unlock Guilt-Free Tap & Go",
      "singleAccountProTipDesc": "Your everyday spending money sits in the same account as your bills buffer. Moving Everyday spending to a separate card lets you tap and spend freely without worrying about dipping into rent.",
      "singleAccountLearnMore": "Learn how it works →",
      "copiedCheck": "✓ Copied",
      "copyAmount": "Copy {symbol}"
    }
  },
  "assistant": {
    "suggestedTitle": "Suggested Questions",
    "chips": {
      "goalDate": "When can I achieve my Goal?",
      "everydayBalance": "How much is left in Everyday?",
      "canAfford": "Can I afford 250 next week?",
      "nextPayday": "When is my next payday?",
      "billsDue": "Which bills are due this week?",
      "internetPaid": "I paid my internet bill 190 on 23-Jan"
    },
    "answers": {
      "greetingHelp": "Hi! I'm Penny, your Money Matters assistant. Ask me about your envelope balances, upcoming bills, next payday, goal dates, or say things like \"create a bill for 80\" or \"can I afford 250?\".",
      "outOfScope": "I can only help with your Money Matters budget, envelopes, bills, goals, paydays, and app actions. Try asking about a balance, upcoming bill, or transaction!",
      "goalProjection": "Based on your current plan, you are projected to reach {goal} ({target}) on {date}.",
      "goalNoTargetDate": "Your {goal} goal currently has {balance} saved toward a {target} target with no target date set yet.",
      "noGoalFound": "We couldn't find a goal named '{goal}'. Check your Goals envelopes in Envelopes.",
      "envelopeBalance": "Your {envelopeName} envelope currently has {balance} available.",
      "envelopeNotFound": "Couldn't find an envelope named '{envelopeName}'. Try checking your Envelopes list.",
      "nextPayday": "Your next scheduled payday is on {date} with an expected {amount} to allocate.",
      "nextPaydayNotScheduled": "No upcoming income event is scheduled yet. Add an income source to preview your next payday.",
      "billsDue": "You have {count} bill(s) due within the next {days} days.",
      "billsDueWithDetails": "You have {count} bill(s) totaling {total} due within the next {days} days: {bills}.",
      "noPendingBillsDue": "You have no bills due within the next {days} days.",
      "billCovered": "✓ {bill} ({amount}) is fully funded in your envelope and ready for its due date.",
      "billUnpaid": "⚠ {bill} ({amount}) currently has a shortfall or is unfunded.",
      "billStatusNotFound": "Couldn't find an envelope or bill named '{bill}'."
    },
    "clarify": {
      "generic": "I couldn't quite understand that. Would one of these help?"
    },
    "unavailable": {
      "quota_exceeded": "Monthly AI limit reached ({limit} calls). Suggested questions and deterministic calculations are still available!",
      "read_only_grace": "Penny AI is paused during your 7-day Payment Grace Period. Please update your payment method in Settings > Subscription.",
      "subscription_required": "Ask Penny requires an active subscription or trial. Manage your plan in Settings > Subscription.",
      "disabled": "Ask Penny is currently disabled for this tenant.",
      "rate_limited": "Too many questions in a short period. Please take a breath and try again in a minute.",
      "service_error": "Penny AI is temporarily unavailable right now. Global search and quick questions still work — please try again shortly.",
      "unauthenticated": "Please sign in to ask questions."
    },
    "settingsCard": {
      "title": "Penny AI Assistant Usage",
      "description": "Ask Penny gives you instant forward-looking answers about goals, upcoming bills, and payday plans.",
      "usedLabel": "{used} of {limit} monthly AI questions used",
      "resetsOn": "Usage resets on {date}",
      "freeNotice": "Suggested questions and quick-action navigation are always 100% free and unlimited."
    }
  }
} as const;
