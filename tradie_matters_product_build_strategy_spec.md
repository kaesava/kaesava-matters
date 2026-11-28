# Tradie Matters — Functional Specification & Build Strategy

> **Document Purpose:** Functional product specification for build planning and architecture mapping against an existing multi-ring codebase (Ring 1: primitives/auth, Ring 2: reusable vertical slices, Ring 3: domain-specific logic). Technical architecture, persistence, and UI implementation decisions are intentionally left to the engineering/coding agent.

---

## 1. Product Positioning & Market Wedge

* **Target Customer:** Small Australian trade businesses (1–5 staff initially; scaling to 12 staff in V3) across electrical, plumbing, carpentry, HVAC, landscaping, and general maintenance.
* **Core Market Gap:** Incumbents punish small crews via per-user pricing (Tradify/Fergus: $156–$385/mo for 3–5 staff) or monthly job-volume caps that penalise unwon quotes (ServiceM8: $79–$149/mo), while locking basic job costing, photos, and progress billing behind premium tiers and failing on offline field reliability.
* **USP:** *"Unlimited quotes, live job costing, and bulletproof offline field tools for your whole crew—at one flat crew rate that never punishes you for hiring an apprentice or having a busy quoting month."*

### Four Non-Negotiable Product Rules
1. **Unwon quotes never count against plan limits.** Tradies quote freely with zero tier shock.
2. **Zero-loss offline field entry.** Every keystroke, photo, variation, and timer event auto-saves locally on every change and syncs cleanly when signal returns (surviving dead zones and incoming phone calls).
3. **Job costing and progress billing included from V1.** Photos, timesheets, deposits, and live job margins are core functionality, never gated behind high-tier upsells.
4. **Built for Australian 2026 cashflow & compliance reality.** Native 10% GST, Payday Super cashflow visibility, and post-October 2026 no-surcharge invoice payment workflows.

---

## 2. Australian Regulatory & Payment Guardrails (Late 2026)

* **GST & Tax Invoices:** Standard 10% GST handling (inclusive/exclusive toggle per business, GST-free line-item support), mandatory ABN display, and compliant "Tax Invoice" formatting.
* **Payday Super (Effective 1 July 2026):** Employers must pay 12% Superannuation Guarantee on every payday (not quarterly). Weekly cashflow visibility comparing *Expected/Overdue Invoices* against *Accrued Crew Wages + 12% Super* is a core V1 owner feature.
* **Card Surcharge Ban (Effective 1 October 2026):** Card network "no-surcharge" rules now apply across eftpos, Visa, and Mastercard in Australia. **Do NOT build a customer card-surcharge pass-through feature.**
  * **Recommended Invoice Payment Hierarchy:**
    1. **PayID / Direct Bank Transfer (Default, $0 fee):** Prominently displayed with 1-tap copy for PayID/BSB/Account/Reference.
    2. **PayTo / Direct Bank Debit (Primary Instant Online Option):** Real-time bank-to-bank settlement with capped low transaction fees (e.g., ~$3.50 cap on large invoices vs. ~$33+ on a $2,000 card payment).
    3. **Online Card / Apple Pay / Google Pay (Optional Toggle per Business or Invoice):** Merchant absorbs processing fee (~1.65% + $0.30 domestic); optionally allow tradies to set a maximum invoice threshold for card acceptance (e.g., disable card on invoices above $1,000) and factor payment overhead into base quote rates.

---

## 3. Recommended Pricing & Monetisation Model

**Selected Model:** Tiered Flat Crew Subscription + Founding Crew Launch Offer + Unbundled SMS Credits.

### Subscription Tiers (AUD, incl. GST)

| Tier | Standard Price | Annual Prepay (2 Months Free) | User Limit | Quotes & Jobs | Primary Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Founding Crew** *(Launch Promo — First 100–250 businesses)* | **$9.95 / mo** *(locked for life)* | **$99 / yr** | Up to 5 users (+ 1 free view-only bookkeeper) | Unlimited | Early-adopter small crews switching from paper, Xero-only, Tradify, or ServiceM8 |
| **Solo** | **$9.95 / mo** | **$99 / yr** | 1 user (+ 1 free view-only bookkeeper) | Unlimited | Sole traders & owner-operators |
| **Small Crew** | **$24.95 / mo** | **$249 / yr** | Up to 5 users (+ 1 free view-only bookkeeper) | Unlimited | Core target: 2–5 person crews |
| **Growing Crew** *(Introduced in V3)* | **$49.95 / mo** | **$499 / yr** | Up to 12 users (+ 1 free view-only bookkeeper + unlimited subbie portals) | Unlimited | Scaling crews (6–12 staff) needing compliance forms & recurring assets |

### Usage Add-Ons & Commercial Guardrails
* **SMS Credit Packs (V2+, Prepaid, No Expiry):** Unbundled to protect unit economics (e.g., $10 for 100 SMS / $0.10 per SMS, undercutting incumbents at $0.15–$0.20/SMS). Email notifications and reminders remain free and unlimited across all plans.
* **Trial Policy:** 14-day full-feature free trial with no credit card required upfront.
* **Version Pricing Rollout:**
  * **V1 Launch:** Offer **Solo ($9.95/mo)** + **Founding Crew ($9.95/mo for up to 5 users)** (standard list price displayed as $24.95/mo to anchor value).
  * **V2 Launch (Accounting Sync & SMS):** Transition new 2–5 user signups to **Small Crew ($24.95/mo)** while honouring Founding Crew rate for early adopters; activate prepaid SMS credit packs.
  * **V3 Launch (Compliance, Assets & Subbies):** Introduce **Growing Crew ($49.95/mo)** tier.

---

## 4. Granular Feature Specification by Version

### V1 — MVP: "Quote-to-Cash Without the Tax"
*Objective: Get a 1–5 person crew live in under 30 minutes, eliminate Sunday-night admin, stop unbilled variations, and accelerate invoice collection.*

#### 4.1 Business Onboarding & Switching Tools
* Guided 5-minute business setup: ABN, GST registration flag, default hourly labour rate, default call-out fee, default markup %, payment terms, PayID/bank details, logo, and default Super Guarantee % (12%).
* Starter pricebook packs selectable by trade (Electrical, Plumbing, Carpentry, HVAC, Landscaping, General Maintenance).
* CSV import wizard for Customers and Pricebook Items (supporting standard export layouts from Xero, Tradify, ServiceM8, and Fergus).

#### 4.2 Customer & Multi-Site Management
* Strict separation between **Customer** (billing party: homeowner, landlord, builder, real estate agency, strata manager) and **Site** (physical job address, gate/lockbox codes, pet/hazard notes, on-site tenant contact).
* Unified history view per Customer and per Site showing all past quotes, jobs, photos, invoices, and outstanding balances.

#### 4.3 Fast Quoting (Zero Quote-Limit Penalties)
* Pricebook search supporting **order-independent fuzzy matching** (e.g., `"gpo clipsal"` matches `"Clipsal Iconic 10A Double GPO"`).
* **Single-link Good / Better / Best quoting:** Optional selectable upgrade groups inside one customer-facing quote URL.
* Configurable **Deposit requirement** (% or fixed $) triggered automatically upon customer acceptance.
* No-login customer quote portal: view quote, toggle optional upgrades, capture digital signature/name/timestamp, and immediately view deposit payment options.
* Automated email quote follow-up sequence (configurable intervals, e.g., Day 2, Day 5, Day 10; auto-halts on acceptance, decline, or manual override).

#### 4.4 Crew Scheduling & Dispatch (Web / Office)
* Drag-and-drop **Daily & Weekly Crew Schedule Board** assigning one or multiple Team Members to Job Visits with arrival windows (e.g., 8:00–10:00 AM) and status colour coding.
* **Unscheduled Backlog Queue** holding accepted quotes and new call-outs awaiting slot assignment.
* Daily job list per tradie ordered by visit time with 1-tap handoff to device navigation maps.
* **Role-Based Permissions:**
  * `Owner`: Full financial, margin, payroll pulse, billing, and operational access.
  * `Admin / Office`: Scheduling, quoting, invoicing, customer management (margin/cost visibility configurable).
  * `Field Tradie`: Assigned visits, site details, notes, photos, timers, material/variation logging (financial margins hidden by default).
  * `Bookkeeper (Free Read-Only)`: Invoices, payments, GST/BAS exports, and approved timesheets.

#### 4.5 Offline-First Field Job Card (Mobile — iOS & Android Parity)
* Offline read/write access to assigned schedule, site history, pricebook, notes, photos, timers, and variations; automatic background sync with explicit sync-status indicator and conflict resolution.
* **Instant Draft Auto-Save:** Every text input, variation, and quote edit persists continuously so phone calls or app switches never discard work.
* **One-Tap Check-In / Check-Out Timer:** Logs start/end timestamps and point-in-time GPS coordinates (no continuous background tracking) directly into Timesheets and Job Costing.
* **Categorised Photo & Attachment Log:** Timestamped photos tagged as `Before`, `During`, `After`, or `Receipt`, with an explicit `Internal Only` vs. `Share with Customer` visibility flag.
* **10-Second On-Site Variation Capture:** Log unplanned extra labour/parts on site, attach photo evidence, and optionally capture immediate on-screen customer signature approval.

#### 4.6 Invoicing, Payment Collection & Automated Chasing
* **1-Tap Conversion Pipeline:** `Accepted Quote + Approved Variations + Logged Extras -> Tax Invoice`.
* Support for **Deposit**, **Progress / Stage** (% or milestone line items), and **Final** invoices.
* Clean handling of **partial payments**, **credit notes**, and **refunds**.
* No-login customer invoice portal featuring **PayID / Bank Transfer** (default, 1-tap copy), **PayTo** (capped-fee instant bank payment), and optional **Card Payment** (with configurable max-invoice threshold to avoid absorbing high card fees on large jobs).
* **Automated Overdue Chasing Engine (Email in V1):** Configurable polite reminders (e.g., -2 days, due date, +3 days, +7 days, +14 days formal overdue notice); auto-pauses when paid or marked disputed.

#### 4.7 Live Job Margin & Payday Cashflow Pulse
* **Per-Job Live Profit Bar:** Real-time comparison of `Quoted / Invoiced Value (ex GST)` vs. `Actual Labour Cost (hours × internal cost rate) + Actual Material Cost`, highlighting jobs dropping below target margin.
* **Weekly Payday Cash Readiness Dashboard:** Compares `Invoices Due This Week` + `Overdue Receivables` against `Accrued Crew Hours × Cost Rate (including 12% Super estimate)`.
* **Accountant Export Pack:** Clean CSV/PDF export of invoices, payments, GST summary, and approved weekly timesheets for manual Xero/MYOB/BAS import prior to V2 direct sync.

---

### V2 — Retention Lock-In: "Bookkeeper & Crew Essential"
*Objective: Eliminate double-entry accounting, centralise customer SMS/MMS, and automate supplier cost capture.*

#### 4.8 Two-Way Accounting & Payroll Sync
* Direct two-way integration with **Xero** (priority 1), followed by **MYOB Business** and **QuickBooks Online**.
* Sync Customers, Tax Invoices, Credit Notes, and Supplier Bills outward; pull reconciled Payment statuses inward to automatically stop overdue reminders.
* Push approved weekly Timesheets directly into payroll to streamline Payday Super processing.

#### 4.9 Two-Way Customer SMS/MMS & Automated Arrival Alerts
* Dedicated business SMS number billed via prepaid SMS credit packs.
* **1-Tap "On My Way" SMS** including calculated ETA from tradie's current position.
* Automated appointment confirmation and 24-hour reminder SMS.
* Two-way SMS & **MMS photo capture** logged directly into the Job's Communication Log (customers reply normally via text without an app/login).
* **Missed-Call Auto-Text Capture:** Automatically sends a polite SMS on missed calls (*"On a job right now—reply with your address and what you need done"*), converting replies and photos into a `Lead` job card.

#### 4.10 Supplier Receipts, Bills & Purchase Orders
* Field receipt capture: photograph a hardware/wholesaler receipt (e.g., Bunnings, Reece, L&H), auto-extract supplier/date/GST/total, assign to a Job's actual cost, and apply default markup.
* Dedicated email-in inbox for forwarding supplier PDF invoices, auto-matching to Jobs via Job Number.
* Simple Purchase Order creation and sending linked to a Job.

#### 4.11 Internal Collaboration & Review Booster
* Private `@mention` internal crew note thread on each Job (strictly segregated from customer messages).
* Automated post-payment customer satisfaction prompt routing positive responses directly to the business's Google Business Review URL.

---

### V3 — Scale & Expansion: "Graduate to 5–12 Staff Without Enterprise Bloat"
*Objective: Retain growing trade businesses and unlock recurring/compliance-heavy workflows.*

#### 4.12 Recurring Maintenance & Site Asset Register
* Recurring job schedules (monthly, quarterly, semi-annual, annual) with auto-generated upcoming visits, reminders, and draft invoices.
* **Site Asset Register:** Track installed/serviced equipment per Site (model, serial number, install date, warranty expiry, service history).

#### 4.13 Offline Compliance Forms & Safety Checklists
* Customisable offline mobile forms and checklists with mandatory photo/signature gates before job completion (SWMS, pre-start risk assessments, trade compliance/safety certificate templates outputting branded PDFs).

#### 4.14 Website Booking Request Widget & Subcontractor Portal
* Embeddable enquiry form for the tradie's website/socials (captures address, scope, photos, and preferred windows into the `Unscheduled Leads` queue—office retains full scheduling control).
* **Subcontractor Assignment Portal:** Assign visits/tasks to external subbies with scoped visibility (site/scope/photos only, no customer pricing), allowing check-in, completion photos, and subbie bill submission with zero daily contractor fees.

#### 4.15 Staged Projects & Margin Analytics
* Multi-phase jobs (e.g., Rough-in → Fit-off → Commissioning) with stage-level budgets vs. actuals.
* Profitability reporting broken down by Job Type, Customer/Agency, and Team Member.

---

## 5. Core Domain Entities & Lifecycle Rules

### Entity Reference Matrix

| # | Entity | Intro Version | Core Functional Attributes | Key Relationships |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Business (Tenant)** | V1 | Legal/Trading Name, ABN, GST Registered, Default GST Rate (10%), Default Markup %, Payment Terms, PayID & Bank Details, Card Acceptance Threshold, Super Rate (12%), Plan Tier, Founding Flag, SMS Credit Balance | Root owner of all tenant records |
| 2 | **Team Member** | V1 | Name, Email, Phone, Role (`Owner`, `Admin`, `Tradie`, `Bookkeeper`, `Subcontractor`), Internal Hourly Cost Rate (incl. super/on-costs), Default Charge Rate, Calendar Colour, Active Flag | Assigned to **Job Visits**; authors **Time Entries**, **Materials**, **Attachments**, **Forms** |
| 3 | **Customer** | V1 | Name/Company, Type (`Residential`, `Commercial`, `Agency`, `Strata`), Primary Contact, Billing Email, Phone, Custom Payment Terms, ABN, Credit Balance, External Accounting ID (V2) | Has many **Sites**, **Jobs**, **Quotes**, **Invoices** |
| 4 | **Site** | V1 | Street Address, Suburb, State, Postcode, Geo Coords, Access Notes (gate/lockbox codes, hazards), On-Site Contact Name/Phone | Linked to 1+ **Customers**; hosts **Jobs** and **Site Assets** |
| 5 | **Pricebook Item** | V1 | SKU/Code, Name, Search Aliases, Category (`Labour`, `Material`, `Call-Out`, `Bundle`), Supplier, Unit Cost (ex GST), Markup %, Sell Price (ex GST), Tax Code (`GST`, `GST-Free`), Favourite Flag | Referenced by **Quote Lines**, **Variation Lines**, **Material Usages**, **Invoice Lines** |
| 6 | **Job** | V1 | Job Number, Title, Scope, Priority, Status (`Lead`, `Quoted`, `Approved`, `Scheduled`, `In Progress`, `On Hold`, `Completed`, `Invoiced`, `Paid`, `Cancelled`), Job Type, Target Margin %, Phase/Stage (V3), Recurrence Rule (V3) | Belongs to **Customer** & **Site**; parent of **Visits**, **Quotes**, **Variations**, **Time**, **Materials**, **Invoices**, **Attachments**, **Comms**, **Forms** |
| 7 | **Job Visit** | V1 | Scheduled Start/End Window, Arrival Status (`Scheduled`, `En Route`, `On Site`, `Done`), Visit Notes, Check-In Timestamp & GPS, Check-Out Timestamp & GPS | Belongs to **Job**; assigned to 1+ **Team Members**; generates **Time Entries** |
| 8 | **Quote & Option Group** | V1 | Quote Number, Expiry Date, Status (`Draft`, `Sent`, `Viewed`, `Accepted`, `Declined`, `Expired`), Deposit Rule (% or $), Option Groups (Good/Better/Best), Line Items, Signer Name/Signature/Timestamp, Auto-Follow-Up State | Belongs to **Job** & **Customer**; converts into **Job Scope** & **Invoice** |
| 9 | **Variation** | V1 | Variation Number, Description, Line Items, Amount (ex/inc GST), Status (`Logged`, `Pending Approval`, `Approved`, `Declined`), Approval Method (`On-Screen Sign`, `SMS`, `Verbal`), Evidence Photos | Belongs to **Job**; rolls into **Invoice** |
| 10 | **Time Entry** | V1 | Date, Start/End Time, Break Mins, Billable Flag, Internal Cost Rate Snapshot, Charge Rate Snapshot, Status (`Draft`, `Submitted`, `Approved`, `Exported`) | Belongs to **Team Member** & optional **Job**; drives **Job Costing** & **Payroll/Super Pulse** |
| 11 | **Material Usage & Supplier Bill** | V1 (Usage) / V2 (Bills & POs) | Description, Supplier, Bill/PO Number, Qty, Actual Unit Cost, Billable Flag, Markup/Sell Price, Receipt Attachment, Accounting Sync Status (V2) | Belongs to **Job**; optional link to **Pricebook Item**; drives **Job Costing** & **Invoice** |
| 12 | **Invoice & Payment** | V1 | Invoice Number, Type (`Deposit`, `Progress`, `Final`), Issue/Due Date, Line Items, Subtotal, GST, Total, Status (`Draft`, `Sent`, `Viewed`, `Partially Paid`, `Paid`, `Overdue`, `Disputed`, `Void`), Chasing State, Allowed Payment Methods, Payments (Date, Amount, Method: `PayID`, `PayTo`, `Card`, `Cash`, `Credit Note`), External Accounting ID (V2) | Belongs to **Job** & **Customer**; aggregates **Quote**, **Variations**, **Time**, **Materials** |
| 13 | **Attachment / Photo** | V1 | File Reference, Category (`Before`, `During`, `After`, `Receipt`, `Document`), Caption, Captured Timestamp, Visibility (`Internal`, `Customer`), Sync Status | Polymorphic link to **Job**, **Site**, **Variation**, **Material Usage**, or **Form** |
| 14 | **Communication Log** | V1 (Email/Events) / V2 (SMS/MMS/@Mentions) | Channel (`Email`, `SMS`, `MMS`, `Internal Note`, `System Event`), Direction (`Inbound`, `Outbound`, `Internal`), Sender/Recipient, Body, Attachments, Delivery Status, Timestamp | Belongs to **Job** & **Customer** |
| 15 | **Compliance Form & Site Asset** | V3 | *Form:* Template, Field Responses, Pass/Fail, Signatures, PDF Output. *Asset:* Type, Make/Model, Serial #, Install/Last Service/Next Due Date, Warranty Expiry | Linked to **Job** and **Site** |

### Core State Transitions (V1 Critical Paths)
* **Job Flow:** `Lead` → `Quoted` → `Approved` → `Scheduled` → `In Progress` → `Completed` → `Invoiced` → `Paid` *(must also allow direct `Lead -> Scheduled` for urgent call-outs skipping formal quotes)*.
* **Financial Immutability:** Once an **Invoice** is issued (`Sent` or beyond), line-item financial amounts lock; adjustments occur via **Credit Notes** or new invoices to preserve Australian GST/BAS audit trails.
* **Cost Snapshotting:** **Time Entries** and **Material Usages** snapshot the active cost/charge rates at creation so later pricebook or wage changes never retroactively distort historical job profit margins.

---

## 6. Entitlement & Version Rollout Summary

| Capability | V1 | V2 | V3 | Solo ($9.95) | Small Crew ($24.95 / $9.95 Founding) | Growing Crew ($49.95) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Unlimited Quotes & Jobs | Yes | Yes | Yes | Yes | Yes | Yes |
| Offline Field App, Auto-Save & Photos | Yes | Yes | Yes | Yes | Yes | Yes |
| Live Job Margin & Variations | Yes | Yes | Yes | Yes | Yes | Yes |
| PayID, PayTo & Optional Card Links | Yes | Yes | Yes | Yes | Yes | Yes |
| Automated Email Chasing & Quote Nudges | Yes | Yes | Yes | Yes | Yes | Yes |
| Crew Dispatch Board, Roles & Payday Cash Pulse | Yes | Yes | Yes | — *(1 user)* | Yes *(up to 5)* | Yes *(up to 12)* |
| Free Read-Only Bookkeeper Seat | Yes | Yes | Yes | Yes | Yes | Yes |
| Two-Way Xero / MYOB / QBO Sync | — | Yes | Yes | Yes | Yes | Yes |
| Two-Way SMS/MMS, On-My-Way & Missed-Call Text | — | Yes | Yes | Credits | Credits | Credits |
| Receipt OCR, Supplier Bills & POs | — | Yes | Yes | Yes | Yes | Yes |
| Compliance Forms (SWMS/Certs), Assets & Recurring | — | — | Yes | — | — | Yes |
| Subcontractor Portal & Staged Projects | — | — | Yes | — | — | Yes |