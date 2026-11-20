---
name: Serene Finance
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#4f5e81'
  on-secondary: '#ffffff'
  secondary-container: '#c4d4fd'
  on-secondary-container: '#4c5b7e'
  tertiary: '#006229'
  on-tertiary: '#ffffff'
  tertiary-container: '#007e37'
  on-tertiary-container: '#c1ffc5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#b7c6ee'
  on-secondary-fixed: '#091b3a'
  on-secondary-fixed-variant: '#374668'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
  surface-card: '#FFFFFF'
  border-subtle: '#E2E8F0'
  text-muted: '#64748B'
  growth-green-light: '#DCFCE7'
  alert-coral: '#EF4444'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a tranquil, disciplined, and optimistic environment for household wealth management and payday allocations. Designed specifically for Australian families navigating dynamic cost-of-living realities, the aesthetic balances modern fiscal precision with emotional calm. Financial management often provokes friction and stress; this UI counters that anxiety by rejecting dense, aggressive spreadsheet patterns in favor of purposeful whitespace, crisp typography, and tranquil, tactile surfaces.

The visual direction combines **Minimalism** with subtle **Tactile / Card Architecture**. Interfaces favor clean vertical rhythm, structural breathing room, and soft envelope-style card enclosures. Financial clarity is achieved through intentional color hierarchy: Deep Navy conveys authoritative institutional grounding, Primary Blue drives dynamic interaction, and Growth Green highlights forward momentum and completed savings targets.

## Colors

The palette operates in a default high-clarity light mode to maximize legibility and serenity.

- **Primary Blue (`#2563EB`)**: Guides primary user actions, current budget envelope focus, and key interactive affordances.
- **Deep Navy (`#1B2B4B`)**: Serves as the primary anchor for core typography, structural headers, high-level balance metrics, and structural container accents.
- **Tertiary / Growth Green (`#22C55E`)**: Reserved for positive financial progress—allocated savings goals, surplus funds, and positive payday flow indicators.
- **Neutral Canvas (`#F7F8FA`)**: The foundational canvas across all primary screens, providing an expansive, low-glare backdrop.
- **Supporting Roles**: Pure white (`#FFFFFF`) isolates active card surfaces from the background; `#64748B` resolves secondary meta-details and subheadings.

## Typography

Typography pairs geometric approachability with numeric rigor:

- **Headlines (Plus Jakarta Sans)**: Delivers friendly authority and contemporary geometric curves, preventing household budgeting from feeling clinical or cold.
- **Body & Interface Elements (Inter)**: Provides systematic readability for dense labels, instructional copy, and budget line-items.
- **Financial Labels & Currency (JetBrains Mono)**: Monospaced treatment for balance counters, dollar inputs, payday progress metrics, and transaction values ensures strict visual alignment across ledger items and summary headers.

## Layout & Spacing

The layout adopts a disciplined fluid grid tailored for high readability across handheld and widescreen viewports:

- **Mobile (< 768px)**: 4-column layout with 1.25rem (`gutter`) column separation and 1.25rem screen margins. Envelope budget cards stack vertically.
- **Tablet (768px – 1024px)**: 8-column layout with 1.5rem gutters, allowing side-by-side envelope allocation boards and household overview widgets.
- **Desktop (> 1024px)**: 12-column layout maxing out at 1200px width with 2rem gutters. Layout provides a persistent balance and allocation drawer alongside main category lanes.
- **Spacing Rhythm**: All container paddings and item intervals snap to the 4px/8px modular base scale (`space-xs` through `space-xl`).

## Elevation & Depth

Visual hierarchy uses a hybrid of tonal layering and soft ambient drop shadows to produce an accessible, paper-envelope metaphor:

- **Base Layer (Canvas)**: Background relies entirely on `#F7F8FA`.
- **Level 1 (Resting Cards & Envelopes)**: Pure white (`#FFFFFF`) surfaces defined by a crisp 1px outline (`#E2E8F0`) and an ambient, low-contrast shadow: `0px 2px 8px -2px rgba(27, 43, 75, 0.04)`.
- **Level 2 (Active/Hover Cards)**: Lifted state when dragging funds between envelopes or selecting transaction details: `0px 8px 24px -4px rgba(27, 43, 75, 0.08)`.
- **Level 3 (Modals & Sticky Allocation Sheets)**: High-priority drawers, payday assignment modals, and floating action prompts utilize a deeper spread: `0px 16px 36px -6px rgba(27, 43, 75, 0.12)`.

## Shapes

The interface embraces a balanced roundedness (Level 2) reflecting calm stability without becoming juvenile:

- **Base Controls & Inputs**: Form fields, buttons, and individual line items feature `rounded` (0.5rem / 8px).
- **Cards & Envelope Blocks**: Grouped budget envelopes, balance summaries, and metric containers scale up to `rounded-lg` (1rem / 16px).
- **Status Badges & Category Chips**: Micro indicators and status tags use fully pill-shaped radii (9999px) for friendly, quick scanning.

## Components

- **Envelope Budget Cards**: Clean white containers featuring a categorized header, monospaced total balance, a subtle progress track (`#E2E8F0` track, `#2563EB` fill, shifting to `#22C55E` when fully funded), and quick allocation shortcut pills.
- **Buttons**:
  - *Primary*: Solid `#2563EB` background with white text, 8px radius, height of 44px, and medium font weight. Subtle scale transition on hover.
  - *Secondary*: Surface white with a 1px `#E2E8F0` border, deep navy text (`#1B2B4B`), and resting elevation.
  - *Growth/Success*: Solid `#22C55E` action button for final payday distribution execution.
- **Payday Distribution Bar**: A composite horizontal component showing total incoming pay, allocated amounts, and unassigned "Buffer" balance in JetBrains Mono.
- **Input Fields**: Crisp `#FFFFFF` backgrounds with 1px `#E2E8F0` borders and 8px radii. Focus states transition the border to `#2563EB` with an ambient `0 0 0 3px rgba(37, 99, 235, 0.15)` focus ring. Currency prefixes use monospaced styling.
- **Chips & Status Pills**: Compact 24px height tags. Growth tags use `#DCFCE7` background with `#22C55E` text for surplus markers; standard categories use `#F1F5F9` with `#1B2B4B` text.
- **Checkboxes & Radios**: 18px rounded square boxes with 4px inner radius. Active check states fill with `#2563EB` and display an ultra-crisp white check glyph.