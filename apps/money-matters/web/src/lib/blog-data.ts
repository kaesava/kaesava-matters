export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  readTimeMinutes: number;
  publishedAt: string;
  authorName: string;
  authorRole: string;
  excerpt: string;
  paragraphs: string[];
  keyTakeaways: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-i-stopped-micromanaging-every-dollar",
    title: "Why I Stopped Micro-Managing Every Dollar (And Built Something Calmer)",
    subtitle: "Traditional budgeting apps worked for me for about three weeks, until the daily receipt tracking made me dread opening them.",
    category: "PHILOSOPHY",
    readTimeMinutes: 3,
    publishedAt: "November 10, 2026",
    authorName: "Kesh",
    authorRole: "Founder, Melbourne VIC",
    excerpt: "I didn't stop budgeting because I stopped caring about money. I stopped because categorising every $4.80 coffee felt like a second job.",
    paragraphs: [
      "Every time I tried a traditional budgeting app, the first two weeks felt great. I'd dutifully tag groceries, coffees, petrol, and chemist runs. By week four, life would get busy, twenty transactions would pile up uncategorised, and I'd quietly stop opening the app.",
      "The problem wasn't discipline. It was the premise. Most budgeting software forces you to look backwards and justify every small purchase. If you miss a few days, the whole system feels broken.",
      "I wanted the opposite: a system where my important bills and savings goals are sorted the day my pay lands, and whatever is left for everyday life is genuinely mine to spend without logging a single receipt.",
      "Instead of forcing you to reconcile line by line, Money Matters gives you 1-click bank alignment called Match Balance. Whenever you glance at your banking app, you just type in the real balance once and the app aligns everything in a second.",
      "And because I still wanted to know where things were heading, I built Projection Mode right into your envelopes. You can scrub forward across the next 12 months and see how your bills and savings look before you ever get there, with no spreadsheets, no guilt, and no daily homework."
    ],
    keyTakeaways: [
      "Backward-looking receipt tracking burns people out within weeks.",
      "1-click Match Balance keeps your numbers honest without line-by-line chores.",
      "Projection Mode shows where your envelopes are heading over the next 12 months."
    ]
  },
  {
    slug: "can-i-afford-it-peace-of-mind",
    title: "Can I Afford It? Buying Without the Guesswork (or the Guilt)",
    subtitle: "When cost of living is tight, the hardest part of spending isn't the price tag. It's wondering what bill you forgot about.",
    category: "PEACE OF MIND",
    readTimeMinutes: 3,
    publishedAt: "November 11, 2026",
    authorName: "Kesh",
    authorRole: "Founder, Melbourne VIC",
    excerpt: "Seeing $2,400 in your bank account doesn't tell you if you can afford a $300 car service. Here is why we built a real-time check before you tap.",
    paragraphs: [
      "With rent, groceries, and power bills all costing more lately, most families I know carry a quiet background hum of financial second-guessing. You look at your bank balance, see a healthy number, and still wonder if buying new school shoes or booking a weekend away is going to hurt you next Thursday.",
      "That uncertainty is why I built the 'Can I Afford It?' check. Before you commit to a purchase, you type in the amount and choose whether it's a one-off buy or a recurring cost. Money Matters looks at every bill due before your next pay, checks your real buffers, and gives you an honest answer, from a clean 'Safe Yes' to 'Wait for Payday' or 'Goal Delayed'.",
      "It pairs naturally with Project Envelopes too. If you're saving for a bathroom fix, a family trip, or Christmas, you can ring-fence a dedicated project envelope and test whether a purchase delays that milestone.",
      "When you want the bigger picture, Reports gives you clean visual trends without drowning you in spreadsheets. And if you just want a quick answer in plain English (like 'how much did we put toward utilities this quarter?'), you can Ask Penny right from the search bar.",
      "The goal isn't to tell you 'no'. It's to give you genuine peace of mind when the answer is 'yes'."
    ],
    keyTakeaways: [
      "Your raw bank balance hides upcoming bills. 'Can I Afford It?' checks them first.",
      "Project Envelopes keep big one-off plans separate from everyday cash.",
      "Reports and Ask Penny give you fast clarity whenever you need a wider view."
    ]
  },
  {
    slug: "payday-allocation-without-the-headache",
    title: "Allocate Payday: Let the Software Do the Heavy Lifting",
    subtitle: "Payday shouldn't mean 45 minutes with a calculator. Pick a preset, protect your priority bills, and let the plan run.",
    category: "PAYDAY ENGINE",
    readTimeMinutes: 4,
    publishedAt: "November 12, 2026",
    authorName: "Kesh",
    authorRole: "Founder, Melbourne VIC",
    excerpt: "This is the heart of Money Matters: presets, priority envelopes that protect your bills automatically, and the freedom to override and freeze a plan when life is messy.",
    paragraphs: [
      "If there's one part of Money Matters I'm proudest of, it's Allocate Payday. The moment income lands, the software figures out exactly where every dollar should go so your bills are never exposed.",
      "You don't have to invent a strategy from scratch either. We include presets (Balanced, Bills Fortress, or Pay Yourself First) that order your priorities automatically, and you can customise or reorder the steps anytime. Priority envelopes sit at the top of the queue so rent, mortgage, power, and rego are always topped up before discretionary spending gets a look-in.",
      "Of course, real life isn't static. Sometimes you get a bonus, or an unexpected vet bill lands mid-week. You can override any payday plan on the spot, save it as a draft, and freeze your numbers in place until you're ready to confirm and apply.",
      "Behind the scenes, your Income Schedules and Expense Schedules keep track of when money arrives and when bills fall due, sending gentle reminders before anything catches you off guard.",
      "You shouldn't have to be a spreadsheet wizard to know your bills are covered. The engine does the heavy lifting; you just review and tap confirm."
    ],
    keyTakeaways: [
      "Presets (Balanced, Safety First, Debt Crusher) set your payday order in seconds.",
      "Priority envelopes protect essential bills before discretionary spending.",
      "Override and freeze payday drafts anytime, backed by income and expense reminders."
    ]
  },
  {
    slug: "built-for-real-households-and-your-data",
    title: "Built for Real Households: From Sharehouses to Growing Families",
    subtitle: "Money looks different in every home. Share what belongs together, keep personal spending private, and always own your data.",
    category: "HOUSEHOLDS & TRUST",
    readTimeMinutes: 3,
    publishedAt: "November 14, 2026",
    authorName: "Kesh",
    authorRole: "Founder, Melbourne VIC",
    excerpt: "Whether you're splitting rent with housemates or running a dual-income family budget, you shouldn't have to choose between collaboration and privacy.",
    paragraphs: [
      "A single person, a sharehouse of three mates, and a family with two kids all handle money differently, yet most finance apps force everyone into one rigid template.",
      "In Money Matters, Shared Envelopes let everyone in the household see and fund common costs like rent, groceries, and utilities together. At the same time, any envelope or bank account you mark as Private stays strictly yours, invisible to everyone else in the household.",
      "That means you can split household bills transparently with a partner or housemate without exposing birthday gifts, personal treats, or your own side savings.",
      "I also feel strongly that you should never be locked in. Full CSV export is built right in and stays free forever, even if your 60-day trial ends and you decide Money Matters isn't for you. Your financial history belongs to you, full stop.",
      "Right now, the full Web app is live and ready for your household to try free for 60 days, and our Android mobile app is actively being tested for release so you can carry that same calm in your pocket."
    ],
    keyTakeaways: [
      "Shared Envelopes align couples, families, and housemates on common bills.",
      "Private Envelopes keep personal spending and gifts 100% confidential.",
      "Full CSV export is always free, and our Android app is in beta testing alongside the live Web app."
    ]
  }
];
