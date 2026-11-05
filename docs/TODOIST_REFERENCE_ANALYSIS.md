# Todoist Reference Analysis (evidence from Rea MCP)

Captured 2026-10-26 with the Rea MCP server (`rea-agents@6.8.0`), tool `capture_browser_scenario`
(launch mode, headless Chromium 155 using the local Chrome binary, 1280x720 and 390x844, light scheme,
reduced motion). Only public pages were opened; no login was attempted and no authentication was bypassed.

## Rea capabilities used / not used
- Used: `capture_browser_scenario` (goto, wait_for_timeout; capture `url`, `screenshot`, `accessibility`).
- Not used: `inspect_web_page` / `capture_web_screenshot` (need a CDP endpoint to an already-open page, none was
  available), DOM capture, network capture, click/fill actions on the demos.
- Limitation: the authenticated web app is not publicly accessible, so **sidebar, task dialogs, the Quick Add
  popup, menus and drag-and-drop were NOT inspected**. Everything about them below is marked *from help text*,
  *inferred* or *unknown*.
- No computed CSS was captured, so colors/spacing below are visual observations from screenshots only.

## Pages actually inspected
| URL | Method | Result |
|---|---|---|
| `/` | desktop screenshot + a11y tree; mobile (390px) screenshot | OK |
| `/features` | desktop screenshot + a11y tree | OK |
| `/pricing` | desktop screenshot + a11y tree | OK |
| `/help` | a11y tree (landing page reached by two guessed article slugs) | OK |
| `/help/todoist/features/introduction-to-filters-V98wIH` | a11y tree (article text) | OK |
| `/help/articles/introduction-to-quick-add-yf8z0F`, `.../introduction-to-the-today-view-5gKNxT3h` | guessed slugs, redirected to `/help`; **content not read** | not inspected |

## Navigation hierarchy (marketing site)
- Header: logo (Home) | Personal (`/features`) | Business (`/teamwork`) | Integrations & AI (menu) |
  Resources (menu) | Pricing | **Log in** | **Start for free** (red button). Dropdown contents were not opened.
- Mobile (390px): header collapses to logo + red "Start for free" + hamburger. A dismissible peach announcement
  banner and a cookie dialog (bottom-right card) are shown at both sizes.
- Footer: Get started, Use cases, Integrations & AI, Resources, Company, social links, legal links, language
  select (19 languages).
- Sign-in/up links go to `/auth/login` and `/auth/signup`; the app itself is behind them (not inspected).

## Visual observations (screenshots only)
- Brand red/coral for primary buttons and logo; warm off-white page background; near-black bold geometric-sans
  headings; grey body copy. Rounded buttons with a lighter lower band. Cards with 1px light borders and large radii.
- Hero: H1 ~64px bold centered, ~20px grey subtitle, one primary CTA.
- Pricing: Monthly/Yearly toggle (Yearly default, "Save 20%"), three cards (Beginner / Pro / Business).

## Features confirmed by public pages (marketing/pricing text)
- Quick Add with natural language; recurring due dates; reminders (custom reminders Pro); 80+ integrations.
- Projects, priorities (1-4), labels, task descriptions, sections, sub-tasks (nestable).
- Views: Today, Upcoming (drag-and-drop planning), Filters; project layouts List / Board / Calendar (Calendar is Pro).
- Collaboration: shared projects, assigned tasks, comments; team workspace (Business).
- Productivity: activity history, completed-tasks archive, Karma, daily/weekly goals, trend charts.
- Plan limits: Beginner 5 personal projects, 3 filters, 5 MB uploads; Pro 300 projects, 150 filters, 100 MB.

## Filters (confirmed in detail from the help article)
Filters are custom saved views. Create: sidebar *Filters & Labels* > "+" next to Filters > name, colour, query.
Edit via pencil icon; optional description shown under the name. Results are computed on open (no live refresh).
Built-in Today/Upcoming/Priority are not filter queries.
Operators: `|` OR, `&` AND, `!` NOT, `%label`, `( )` grouping, `,` separate lists, `\` escape (`#Shopping\ list`).
Atoms listed: `today`, `overdue`/`od`, `no date`, `!no date`, `no time`, `recurring`, `p1`..`p4`, `#Project`,
`date:`/`due:` with `before:`/`after:`, relative dates (`+4 hours`, `5 days`, `next week`), `deadline:` variants,
`search:`, `subtask`, `All`. Renaming a project breaks filters that reference the old name.

## Workflows: confirmed vs inferred vs unknown
- Confirmed (text only): Quick Add NL, complete, recurring, organise by project/section/label, prioritise,
  filters, list/board/calendar, comments, sharing.
- Inferred (not observed): Quick Add token syntax (`#project`, `@label`, `p1`, `/section`), keyboard shortcuts,
  sidebar layout, task detail modal.
- Unknown: exact app spacing, dialogs, menus, undo toast, drag handles, empty states, app responsive behavior.

## Responsive behavior inspected
- 1280px: full nav bar. 390px: hamburger nav; hero text reflows to four lines; single column.
