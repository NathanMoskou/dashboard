# Life OS — Design System

> Drop this file into Claude Design as context. It documents every visual decision in the Life OS personal dashboard — a bold, playful SaaS-style Next.js app built with Tailwind CSS v4 and React 19.

---

## 1. Design Philosophy

**Bold, colorful, personal.** Life OS should feel like a product you'd pay for — not a hobby project. Think Linear's polish × Notion's flexibility × a fun indie startup.

- **Distinct section colors** — each area of the app owns a hue
- **Cards as the atomic layout unit** — everything lives in a card
- **Subtle but present texture** — the dot-grid gives depth without noise
- **Dark mode is a first-class citizen** — not an afterthought

---

## 2. Color Tokens

All colors are CSS custom properties toggled by a `.dark` class on `<html>`. The JS init script reads `localStorage.theme` before first paint to prevent flash.

### Semantic Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg` | `#f3f1ff` | `#0c0c12` | Page background |
| `--bg-2` | `#ece9fc` | `#111119` | Slightly elevated bg |
| `--fg` | `#1c1727` | `#eeeaf8` | Body text |
| `--muted` | `#ece9fc` | `#1a1a24` | Muted backgrounds |
| `--muted-fg` | `#6c6894` | `#8f8da8` | Secondary / placeholder text |
| `--border` | `#dcd8f5` | `#272535` | Card & input borders |
| `--card` | `#ffffff` | `#161620` | Card surface |
| `--card-fg` | `#1c1727` | `#eeeaf8` | Text on cards |

### Brand Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | `#7c3aed` | `#a78bfa` | Purple — main brand, Today, Habits |
| `--primary-fg` | `#ffffff` | `#0c0c12` | Text on primary backgrounds |
| `--primary-soft` | `#ede9fe` | `#261d50` | Soft purple fills |
| `--good` | `#059669` | `#34d399` | Green — Finance, Health, success |
| `--good-soft` | `#d1fae5` | `#053d34` | Soft green fills |
| `--warn` | `#d97706` | `#fbbf24` | Amber — Work Timer, warnings |
| `--warn-soft` | `#fef3c7` | `#402b00` | Soft amber fills |
| `--bad` | `#e11d48` | `#fb7185` | Rose — Reflection, errors, destructive |
| `--bad-soft` | `#ffe4e6` | `#460d1b` | Soft rose fills |
| `--accent` | `#ea580c` | `#fb923c` | Orange — Focus/Tasks, secondary CTAs |
| `--accent-soft` | `#ffedd5` | `#4e1900` | Soft orange fills |

### Section Color Map

Each app section owns a specific accent. Use it on card top borders, active nav items, icon fills, and KPI values.

| Section | Color Token | Hex (light) |
|---------|-------------|-------------|
| Today | `--primary` | `#7c3aed` |
| Habits | `--primary` | `#7c3aed` |
| Health | `--good` | `#059669` |
| Finance | `--good` | `#059669` |
| Reflection | `--bad` | `#e11d48` |
| Focus / Tasks | `--accent` | `#ea580c` |
| Work Timer | `--warn` | `#d97706` |
| Settings | `--muted-fg` | `#6c6894` |

### Dot-Grid Texture

```css
--dot: #d8d3f4;   /* light */
--dot: #1f1d2e;   /* dark */

body {
  background-image: radial-gradient(var(--dot) 1.5px, transparent 1.5px);
  background-size: 22px 22px;
}
```

---

## 3. Typography

### Fonts

| Role | Font | Source |
|------|------|--------|
| **UI / Display** | Plus Jakarta Sans | Google Fonts via `next/font` |
| **Monospace** | Geist Mono | Google Fonts via `next/font` |

Plus Jakarta Sans is loaded with weights `400 500 600 700 800`. It is **bold, rounded, and SaaS-y** — the primary personality carrier of the design.

### Type Scale

| Role | Class | Size | Weight | Notes |
|------|-------|------|--------|-------|
| Page title (h1) | `text-3xl font-extrabold tracking-tight` | 30px | 800 | LiveHeader component |
| Section title | `text-base font-bold tracking-tight` | 16px | 700 | CardTitle component |
| Body | `text-sm` | 14px | 400–500 | Default prose |
| Label / meta | `text-xs uppercase tracking-wider font-medium text-muted-fg` | 12px | 500 | KPI labels, subtitles |
| KPI metric | `text-2xl font-bold tabular-nums` | 24px | 700 | Finance numbers, scores |
| Hero metric | `text-4xl font-semibold tabular-nums` | 36px | 600 | Life Score |
| Monospace time | `font-mono tabular-nums font-semibold` | 16px | 600 | LiveHeader clock |
| Tiny badge text | `text-[10px] font-medium` | 10px | 500 | Badges, chips |

---

## 4. Spacing & Layout

- **Base grid**: 4px (`1` = 4px in Tailwind)
- **Content max-width**: `max-w-3xl` (768px)
- **Page padding**: `px-4 py-5` mobile · `p-8` desktop
- **Card gap**: `space-y-6` between cards on a page
- **Card internal padding**: `p-5` (CardContent), `p-5 pb-3` (CardHeader)
- **Nav sidebar width**: `w-64` (256px), fixed

---

## 5. Shadows

| Name | Value | Usage |
|------|-------|-------|
| `--shadow-card` | `0 1px 3px rgba(109,92,240,.06), 0 4px 16px rgba(109,92,240,.07)` | Resting card |
| `--shadow-card-hover` | `0 4px 12px rgba(109,92,240,.12), 0 12px 32px rgba(109,92,240,.12)` | Hovered card |
| Nav active glow | `0 2px 14px rgba(109,92,240,.4)` | Sidebar active item |

All shadows use purple tinting for brand cohesion even on non-purple sections.

---

## 6. Border Radius

| Element | Token | Value |
|---------|-------|-------|
| Card | `rounded-2xl` | 16px |
| Button (primary) | `rounded-full` | 9999px |
| Button (small) | `rounded-full` | 9999px |
| Input | `rounded-xl` or `rounded-md` | 12px / 6px |
| Nav item | `rounded-xl` | 12px |
| Badge | `rounded-full` | 9999px |
| Logo badge | `rounded-2xl` | 16px |
| Tag / chip | `rounded-full` | 9999px |

---

## 7. Motion & Animation

### Page Entry
```css
@keyframes page-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page-in {
  animation: page-in 0.24s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```
Applied on every route change via a `PageWrapper` component that uses `key={pathname}` to force remount.

### Card Hover Lift
```css
/* Applied globally to every Card component */
hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] transition-all duration-200
```

### Button Press
```
active:scale-95  transition-all duration-150
```
Applied to all `<Button>` and button-styled `<Link>` elements.

### Destructive Shake
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%  { transform: translateX(-5px); }
  40%  { transform: translateX(5px);  }
  60%  { transform: translateX(-4px); }
  80%  { transform: translateX(4px);  }
}
.shake { animation: shake 0.3s ease-in-out; }
```
Add `.shake` class on destructive action buttons when triggered.

### Loading Skeleton
```css
.skeleton {
  background: var(--muted);
  border-radius: 6px;
  animation: pulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Progress Bar
Width transitions: `transition-[width] duration-500`

---

## 8. Components

### Card

The atomic layout unit. White background, soft purple-tinted shadow, 16px radius.

**Props:**
- `accent?: string` — CSS color value applied as a 3px solid top border
- `className` — passthrough

**Accent usage by section:**
```tsx
<Card accent="var(--primary)">   // Today, Habits
<Card accent="var(--good)">      // Finance, Health
<Card accent="var(--bad)">       // Reflection
<Card accent="var(--accent)">    // Focus/Tasks
<Card accent="var(--warn)">      // Work Timer
```

**Anatomy:**
```
┌──────────────────────────────────────┐  ← 3px top border (section color)
│  CardHeader (p-5 pb-3)               │
│    CardTitle (font-bold)             │
│    CardDescription (text-muted-fg)   │
├──────────────────────────────────────┤
│  CardContent (p-5 pt-0)              │
└──────────────────────────────────────┘
```

---

### Button

**Variants:** `default` (purple) · `outline` · `ghost` · `destructive` (red) · `good` (green) · `warn` (amber)

**Sizes:** `default` (h-10) · `sm` (h-8) · `lg` (h-12) · `icon` (h-10 w-10)

**Key classes:**
```
rounded-full font-semibold active:scale-95 transition-all duration-150
```

**Do:** Use `default` for primary CTAs, `outline` for secondary, `destructive` only for irreversible actions.  
**Don't:** Mix button variants in the same action group. Never use `rounded-xl` — all buttons are `rounded-full`.

---

### Badge

Small inline pill label.

**Variants:** `default` · `outline` · `good` · `warn` · `bad` · `primary`

```
rounded-full px-2.5 py-0.5 text-[11px] font-medium
```

---

### Progress

Single-line bar, fills with section color.

```tsx
<Progress value={75} />                        // uses --primary
<Progress value={75} color="var(--good)" />    // custom color
```

Height: `h-1.5` · Rounded: `rounded-full` · Transition: `duration-500`

---

### LiveHeader

Fixed page header that shows the page title, optional subtitle, optional action slot, and a live clock (right-aligned, monospace).

```tsx
<LiveHeader
  title="Habits"
  subtitle="DAGELIJKSE ROUTINES"   // auto-uppercased, tracked
  action={<Link>← Terug</Link>}
/>
```

- Title: `text-3xl font-extrabold tracking-tight`
- Subtitle: `text-sm text-muted-fg mt-1 font-medium uppercase tracking-wider`
- Clock: `font-mono tabular-nums font-semibold text-base`

---

### Breadcrumb

Sits above `LiveHeader` on sub-pages.

```tsx
<Breadcrumb crumbs={[
  { label: "Habits", href: "/habits" },
  { label: "Heatmap" }   // no href = current page (bold)
]} />
```

Visual: `chevron-right` separator · `text-xs text-muted-fg` · current page `text-fg font-medium`

---

### Sidebar (desktop)

**Logo area:**
- "LO" monogram: `rounded-2xl bg-gradient-to-br from-primary to-purple-500/70`, `font-black`
- "Life OS" wordmark: gradient text `from-primary to-accent` (purple → orange)
- Tagline: `"✦ Personal Dashboard"` — `text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-fg`

**Nav items:**
- Active: `rounded-xl bg-[section-color] text-white font-bold shadow-[section-glow]`
- Inactive: `rounded-xl text-[section-color] hover:bg-[section-soft] font-medium`
- Each item has a lucide-react icon (17px) + text label

**Footer:**
- Thin `border-t border-border` separator
- `ThemeToggle` button (Moon/Sun icon, full-width)
- Logout button

---

### MobileNav

Fixed top bar (h-14) with hamburger + current section label (colored) + ThemeToggle compact icon.

Slide-in drawer (w-72) from left with:
- Same logo as desktop sidebar
- Nav links (rounded-xl, `font-bold` active, `font-medium` inactive)
- ThemeToggle in footer

Backdrop: `bg-black/40 backdrop-blur-[2px]`

---

### ThemeToggle

Two modes:
- `compact` — icon-only button (`p-2 rounded-xl`)
- Full — `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm` with label "Donker thema" / "Licht thema"

Persists to `localStorage.theme`. Reads `prefers-color-scheme` as default when no preference set. JS init script in `<head>` prevents FOUC.

---

## 9. Layout Patterns

### Page with Cards
```
<div className="space-y-6">
  <Breadcrumb ... />          ← sub-pages only
  <LiveHeader ... />
  <Card accent="var(--primary)">
    ...
  </Card>
  <Card>
    ...
  </Card>
</div>
```

### KPI Grid (Finance / Today)
```
<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
  <Card accent="var(--good)">     ← Income
  <Card accent="var(--bad)">      ← Expenses
  <Card accent="var(--primary)">  ← Net
  <Card accent="var(--warn)">     ← Savings rate
</div>
```

### Collapsible Section (Habits)
Header button → expand/collapse content. Used for grouping habits by time of day (Morning / Afternoon / Evening).

### Mobile Sheet
On mobile, the main content area floats as a white card above the lavender dot background:
```
-mx-4 bg-card rounded-t-3xl px-5 pt-7 pb-6
shadow-[0_-6px_32px_rgba(15,23,42,0.08)]
md:mx-0 md:bg-transparent md:rounded-none md:shadow-none
```

---

## 10. Empty States

Centered in a card, with a large emoji and a short message.

**Pattern:**
```tsx
<div className="flex flex-col items-center gap-2 py-8 text-center">
  <span className="text-3xl">💸</span>
  <p className="text-sm font-medium">Nothing here yet</p>
  <p className="text-xs text-muted-fg">Short helpful instruction.</p>
</div>
```

**Emoji by section:**
- Finance: 💸
- Habits: ✅
- Tasks: 📋
- Reflection: 📓
- Health: 💪
- Generic: 👀

---

## 11. Data Display

### Table
```
<table className="w-full text-sm">
  <thead>
    <tr className="text-left text-xs text-muted-fg uppercase">
  <tbody>
    <tr className="border-t border-border hover:bg-muted/40 transition-colors">
```

### List (divide-y)
```
<ul className="divide-y divide-border">
  <li className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors">
```

### Heatmap (GitHub-style)
- 13 weeks × 7 days grid
- Columns = weeks (left to right), rows = Mon–Sun
- Cell: `h-6 w-6 rounded-sm`
- Future cells: `bg-muted/20`
- Color scale: `bg-muted` → `bg-bad/40` → `bg-warn/70` → `bg-good/60` → `bg-good`

---

## 12. Form Elements

### Input
```
h-10 w-full rounded-md border border-border bg-card px-3 text-sm
focus:outline-none focus:ring-2 focus:ring-primary/30
```

### Select
Same height/border as Input. No custom arrow — browser native.

### Label
```
text-sm font-medium mb-1.5
```

---

## 13. Accessibility

- **Focus ring**: global `*:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }`
- **ARIA labels**: all icon-only buttons have `aria-label`
- **Keyboard nav**: breadcrumbs, nav items, cards with links are all keyboard accessible
- **Color contrast**: all text meets WCAG AA (tested on both light and dark)
- **Reduced motion**: consider adding `@media (prefers-reduced-motion: reduce)` to disable `page-in` and card hover transforms

---

## 14. Do's & Don'ts

| ✅ Do | ❌ Don't |
|------|---------|
| Use `rounded-full` on all buttons and action links | Use `rounded-md` or `rounded-lg` on buttons |
| Give every Card on a section page the section's accent color | Mix accent colors randomly |
| Use `font-extrabold` for page titles | Use `font-semibold` or lighter for h1 |
| Use `uppercase tracking-wider text-muted-fg` for meta labels | Write labels in sentence case |
| Use the section color for icon fills and KPI numbers | Use `text-fg` for data-heavy numbers |
| Keep card content inside `CardContent` with `pt-0` | Add `pt-5` to CardContent (double-pads) |
| Use `active:scale-95` on every interactive element | Skip press feedback on mobile |
| Use `.shake` class for destructive action error feedback | Use a modal for every error |

---

## 15. Tokens Quick Reference

```css
/* Spacing */
--card-pad: 1.25rem;   /* p-5 */
--gap-sm: 0.5rem;      /* gap-2 */
--gap-md: 0.75rem;     /* gap-3 */
--gap-lg: 1.5rem;      /* gap-6 */

/* Borders */
--radius-card: 1rem;      /* rounded-2xl */
--radius-btn: 9999px;     /* rounded-full */
--radius-input: 0.375rem; /* rounded-md */
--card-accent-width: 3px; /* top border accent */

/* Motion */
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast: 150ms;
--duration-page: 240ms;
```
