# Kagochi Farm Enterprise — Complete UI/UX Redesign Implementation Plan

Working branch: `migration/neon-postgres`  
Frontend root: `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend`  
Build command: `npm run build` (runs `tsc -b && vite build`) inside the frontend directory.

---

## Ground truth from codebase exploration

- Three CSS layers already exist: `index.css` (global reset + CSS custom properties), `App.css`
  (auth page + legacy dashboard styles), `design.css` (full `kf-*` design system). The `kf-*`
  variables in `design.css` use slightly different names (`--kf-forest`, `--kf-action`, etc.) than
  the `index.css` variables (`--primary`, `--brand-action`). The plan creates `tokens.css` as the
  single source of truth and updates both files to reference it.
- `main.tsx` currently imports only `index.css`; `App.tsx` imports `App.css` then `design.css`.
  `tokens.css` must be imported first in `main.tsx`.
- The `kf-*` class system is already comprehensive and is used by views. All plan items extend or
  update it — they do not replace it.
- `SideNav.tsx` is already a slide-in drawer (hidden on mobile, persistent possible on desktop).
  The CSS already has `@media (min-width: 1024px)` rules for `.kf-menu-button { display: none }`.
  The desktop persistent sidebar requires CSS and a `kf-content` margin adjustment that App.tsx
  can read from a CSS media query — no JS state changes needed.
- `BottomNav.tsx` shows only 3+1 buttons. The plan expands it to 5 direct destinations.
- `HomeView.tsx` is already well-structured using `kf-*` components. It needs a welcome banner,
  a CSS split-bar class (`.kf-split-bar` used inline but undefined), and the CSS bar visualization.
- `PoultryView.tsx` uses non-kf classes (`view-container`, `poultry-kpi-grid`, `kpi-card`, etc.)
  that are not in `design.css` — these come from a large CSS file in a pattern used across most
  views. All views need migration to `kf-*` classes.
- `FeedingView.tsx`, `ProductionView.tsx`, `ExpensesView.tsx`, `LivestockView.tsx` use `alert()`
  for errors — replace with inline error state.
- `VaccinationsView.tsx` and `AdvisorView.tsx` have old non-kf markup.
- `AdvisorView.tsx` uses a separate `FarmChatbot.tsx` component — preserve it, redesign the
  wrapper.
- `PerformanceView.tsx` has a CSV export — preserve it.
- No `tokens.css` exists yet. `FarmIcons.tsx` has custom SVG icons (ChickIcon, ChickenIcon,
  CowIcon, CalfIcon, HeiferIcon) — preserve them.
- TypeScript target: strict mode via `tsc -b`. All new code must pass `tsc`.

---

## Implementation Plan

- [ ] 1. **Create `tokens.css` — single source of truth for all design tokens**

  Create a new file `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\styles\tokens.css`
  that declares the complete set of CSS custom properties for the new brand palette, spacing scale,
  border-radius, shadow, and typography tokens. All values must match the specification in the task
  brief exactly. The file maps the new token names to the existing `kf-*` and `--primary` /
  `--brand-*` names so no downstream reference breaks.

  Key properties to declare:
  ```
  --kf-forest:         #1a3d2b
  --kf-forest-2:       #1a3d2b
  --kf-forest-3:       #2d6a4f
  --kf-action:         #2d6a4f
  --kf-action-hover:   #1a3d2b
  --kf-action-soft:    #e8f5f0
  --kf-lime:           #52b788
  --kf-surface:        #ffffff
  --kf-white:          #ffffff
  --kf-cream:          #fafaf8
  --kf-cream-2:        #fafaf8
  --kf-text:           #1a1a18
  --kf-muted:          #6b7280
  --kf-muted-2:        #9ca3af
  --kf-border:         #e0e0d8
  --kf-border-strong:  #d0d0c8
  --kf-red:            #dc2626
  --kf-red-soft:       #fef2f2
  --kf-amber:          #d97706
  --kf-amber-soft:     #fffbeb
  --kf-blue:           #2563eb
  --kf-blue-soft:      #eff6ff
  --kf-plum:           #7c3aed
  --kf-plum-soft:      #f5f3ff
  --kf-radius-sm:      8px
  --kf-radius:         12px
  --kf-radius-lg:      16px
  --kf-shadow-xs:      0 1px 3px rgba(26,61,43,0.06)
  --kf-shadow-sm:      0 4px 14px rgba(26,61,43,0.08)
  --kf-shadow-md:      0 12px 32px rgba(26,61,43,0.12)
  --kf-sidebar-width:  240px
  --kf-header-height:  60px
  --kf-bottom-nav-height: 68px
  --kf-font:           "Inter","Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif
  ```

  Also declare the legacy aliases in `:root` so `index.css` and `App.css` references remain valid:
  ```
  --primary:           var(--kf-action)
  --primary-dark:      var(--kf-action-hover)
  --primary-light:     var(--kf-action-soft)
  --background:        var(--kf-cream)
  --surface:           var(--kf-surface)
  --text:              var(--kf-text)
  --text-muted:        var(--kf-muted)
  --border:            var(--kf-border)
  --brand-forest:      var(--kf-forest)
  --brand-action:      var(--kf-action)
  --brand-action-dark: var(--kf-action-hover)
  --brand-action-light:var(--kf-action-soft)
  ```

  Files to **create**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\styles\tokens.css`

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\main.tsx` — add
    `import "./styles/tokens.css"` as the very first import, before `./index.css`.

  Verify: `npm run build` in `frontend` — zero TypeScript errors, zero Vite errors.

---

- [ ] 2. **Update `design.css` — remap `kf-*` variable values, add missing utility classes, fix
  sidebar desktop behavior**

  Edit `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\styles\design.css`:

  a) Remove the `:root` block at the top of `design.css` entirely (tokens.css owns all values now).
     Verify no `--kf-*` literals remain in `design.css` `:root` — they are now inherited from
     `tokens.css`.

  b) Sidebar desktop rule: add at the bottom of the sidebar section:
  ```css
  @media (min-width: 1024px) {
    .kf-sidebar {
      transform: translateX(0);
      position: fixed;
      box-shadow: none;
      border-right: 1px solid rgba(255,255,255,0.08);
    }
    .kf-sidebar-backdrop { display: none !important; }
    .kf-sidebar-close    { display: none; }
    .kf-content {
      margin-left: var(--kf-sidebar-width);
    }
    .kf-header {
      left: var(--kf-sidebar-width);
    }
  }
  ```

  c) Add `.kf-split-bar` (used in HomeView but not defined):
  ```css
  .kf-split-bar {
    display: flex;
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
    gap: 2px;
    margin-bottom: 6px;
  }
  .kf-split-bar span {
    border-radius: 999px;
    height: 100%;
    transition: width 0.4s ease;
  }
  ```

  d) Add `.kf-css-bar` classes for CSS-only bar charts (used in PerformanceView):
  ```css
  .kf-bar-chart { display: flex; flex-direction: column; gap: 8px; }
  .kf-bar-row   { display: flex; align-items: center; gap: 10px; font-size: 12px; }
  .kf-bar-label { width: 120px; flex-shrink: 0; color: var(--kf-muted); overflow: hidden;
                  text-overflow: ellipsis; white-space: nowrap; }
  .kf-bar-track { flex: 1; height: 8px; background: var(--kf-cream); border-radius: 999px;
                  overflow: hidden; }
  .kf-bar-fill  { height: 100%; border-radius: 999px; background: var(--kf-action);
                  transition: width 0.5s ease; }
  .kf-bar-fill--red   { background: var(--kf-red); }
  .kf-bar-fill--amber { background: var(--kf-amber); }
  .kf-bar-fill--blue  { background: var(--kf-blue); }
  .kf-bar-value { width: 64px; text-align: right; font-weight: 700; font-size: 12px;
                  color: var(--kf-text); flex-shrink: 0; }
  ```

  e) Add mobile responsive rules at the bottom of the file:
  ```css
  @media (max-width: 1023px) {
    .kf-page { padding: 20px 16px 80px; }
    .kf-grid--main-side { grid-template-columns: 1fr; }
    .kf-grid--3 { grid-template-columns: 1fr; }
    .kf-grid--2 { grid-template-columns: 1fr; }
    .kf-grid--stats { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 639px) {
    .kf-grid--stats { grid-template-columns: 1fr; }
    .kf-form-grid--2 { grid-template-columns: 1fr; }
    .kf-bottom-nav { left: 0; right: 0; bottom: 0; border-radius: 0;
                     padding-bottom: env(safe-area-inset-bottom); }
    .kf-page { padding-bottom: calc(var(--kf-bottom-nav-height) + 16px); }
    .kf-content { padding-bottom: 0; }
    .kf-header { padding: 0 14px; }
    .kf-header-brand-tag { display: none; }
    .kf-menu-button { display: grid !important; }
  }
  @media (min-width: 640px) and (max-width: 1023px) {
    .kf-grid--stats { grid-template-columns: repeat(2, 1fr); }
  }
  ```

  f) Ensure all input/select/textarea `font-size` is at least 16px on mobile (prevents iOS zoom):
  ```css
  @media (max-width: 767px) {
    .kf-app input, .kf-app select, .kf-app textarea,
    .kf-auth-page input, .kf-auth-page select, .kf-auth-page textarea {
      font-size: 16px;
    }
  }
  ```

  g) Ensure all `.kf-btn` and nav buttons meet the 44px touch target:
  ```css
  @media (max-width: 1023px) {
    .kf-btn { min-height: 44px; }
    .kf-icon-btn { width: 44px; height: 44px; }
  }
  ```

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\styles\design.css`

  Verify: `npm run build` — zero errors.

---

- [ ] 3. **Update `App.css` — replace old `:root` values and remove duplicate token definitions**

  In `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\App.css`, remove the entire `:root {
  … }` block at the top (lines 1–20 approximately, the block with `--primary`, `--background`,
  etc.) since `tokens.css` now owns all of these. The rest of `App.css` still provides auth page
  and legacy dashboard CSS — keep it intact. After deleting the `:root` block, do a search for any
  color hex literals that were in that `:root` and verify they still resolve via the token
  variables.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\App.css`

  Verify: `npm run build` — zero errors. Manual check: the auth page still renders with green
  primary color.

---

- [ ] 4. **Redesign `Header.tsx` — light top bar with page-context title, bell icon placeholder,
  avatar, hamburger on mobile**

  Rewrite `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\components\Header.tsx` to:

  - Keep the same `HeaderProps` interface (no new props needed — the hamburger is already wired
    via `onMenuToggle`).
  - On desktop (≥1024px): the header shows only the page title (from `VIEW_LABELS[activeView]`) on
    the left side and the user avatar + name on the right. The brand logo is hidden in the header on
    desktop because it appears in the persistent sidebar.
  - On mobile (<1024px): show hamburger button on the left (calls `onMenuToggle`), brand mark + name
    in center, avatar on right.
  - Add a `Bell` icon button (aria-label="Notifications", no functionality needed — visual only)
    next to the avatar.
  - Use only `kf-header`, `kf-header-left`, `kf-header-right`, `kf-avatar`, `kf-menu-button`,
    `kf-header-user`, `kf-header-brand`, `kf-header-context` CSS classes (all already in
    `design.css`).
  - Import `Bell`, `Leaf`, `Menu`, `User` from `lucide-react`. All 20px, strokeWidth 1.5.
  - Initials-based avatar: take first letter of first + last word of `userName`.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\components\Header.tsx`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 5. **Redesign `SideNav.tsx` — update icon set, nav labels, and desktop-always-visible state**

  Edit `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\components\SideNav.tsx`:

  - Replace the `Egg`, `Sparkles` imports with `BarChart2`, `MessageCircle`, `Settings` from
    lucide-react (all other icons already imported).
  - Update `NAV_SECTIONS` with the exact icon mapping from the task brief:
    - Dashboard → `LayoutDashboard`
    - Poultry → `Bird`
    - Livestock → `Beef`
    - Production → `TrendingUp` (re-use existing import)
    - Feeding → `Wheat`
    - Expenses → `Wallet`
    - Performance → `BarChart2`
    - Vaccination → `Syringe`
    - AI Advisor → `MessageCircle`
    - Survivors → `Activity` (keep)
    - Mortality → `TrendingDown` (keep)
  - Add a Settings entry at bottom of nav sections:
    `{ id: "admin", label: "Settings", description: "Farm admin panel", icon: <Settings size={19} /> }`
  - Update nav section labels to be more concise: "Overview", "Farm records", "Population",
    "Reports & AI", "Admin".
  - All icons: size 19, strokeWidth 1.5 (add `strokeWidth={1.5}` to every icon in NAV_SECTIONS).
  - Keep the `kf-sidebar-backdrop`, `kf-sidebar`, `kf-sidebar-head`, `kf-sidebar-scroll`,
    `kf-sidebar-foot` structure exactly as-is — only content changes.
  - On desktop the sidebar is always visible (handled by CSS in item 2). The `isOpen` prop still
    controls mobile drawer, no JS change needed.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\components\SideNav.tsx`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 6. **Redesign `BottomNav.tsx` — 5 direct destinations, lucide icons at 20px strokeWidth 1.5**

  Rewrite `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\components\BottomNav.tsx`:

  The 5 tabs:
  1. Home → `LayoutDashboard` → view `"home"`
  2. Poultry → `Bird` → view `"poultry"`
  3. Analytics → `BarChart2` → view `"performance"`
  4. Advisor → `MessageCircle` → view `"advisor"`
  5. More → `Menu` → calls `onMore()`

  Keep the same `BottomNavProps` interface unchanged (`activeView`, `setActiveView`, `onMore`).
  Active state: `is-active` class on the matching button. Use `aria-current="page"` on active
  destination buttons. "More" has no `aria-current`.

  The bottom nav is hidden on desktop (≥1024px) via the existing `@media (min-width: 1024px)
  .kf-bottom-nav { display: none }` — add that rule to `design.css` in item 2 if not already
  present. Check: the existing `design.css` does not have this rule, so add it in item 2.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\components\BottomNav.tsx`

  Also add to `design.css` (in item 2):
  ```css
  @media (min-width: 1024px) { .kf-bottom-nav { display: none; } }
  ```

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 7. **Update `ui.tsx` — add `Spinner`, `CssBar`, `Card` components; improve `Modal`
  accessibility (focus trap)**

  Edit `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\components\ui.tsx`:

  a) **`Spinner`** — new export:
  ```tsx
  export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const px = size === "sm" ? 16 : size === "lg" ? 28 : 20;
    return <Loader2 size={px} className="kf-spin" aria-label="Loading" aria-hidden="true" />;
  }
  ```

  b) **`CssBar`** — new export for CSS-only bar chart rows:
  ```tsx
  interface CssBarProps { label: string; value: number; max: number; formatted: string;
                          tone?: "green" | "red" | "amber" | "blue"; }
  export function CssBar({ label, value, max, formatted, tone = "green" }: CssBarProps) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
      <div className="kf-bar-row">
        <span className="kf-bar-label" title={label}>{label}</span>
        <div className="kf-bar-track">
          <div className={`kf-bar-fill kf-bar-fill--${tone === "green" ? "" : tone}`}
               style={{ width: `${pct}%` }} />
        </div>
        <span className="kf-bar-value">{formatted}</span>
      </div>
    );
  }
  ```
  Note: `kf-bar-fill--` (empty string for green) resolves to the base `.kf-bar-fill` style
  (green). Adjust the class logic: use `tone !== "green" ? ` kf-bar-fill kf-bar-fill--${tone}` :
  "kf-bar-fill"`.

  c) **`Modal` focus trap** — inside the `useEffect` in `Modal`, after `document.addEventListener`,
  add a focus-trap: find all focusable elements inside the dialog and on Tab/Shift+Tab keep focus
  within them. Use the `kf-modal` div via a `useRef`.

  d) **`Card`** — new export with header/body/footer slots:
  ```tsx
  interface CardProps {
    title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode;
    footer?: ReactNode; children: ReactNode; className?: string;
  }
  export function Card({ title, subtitle, actions, footer, children, className = "" }: CardProps) {
    return (
      <div className={`kf-panel ${className}`}>
        {(title || actions) && (
          <div className="kf-panel-header">
            <div>{title && <h2 className="kf-panel-title">{title}</h2>}
                 {subtitle && <p className="kf-panel-subtitle">{subtitle}</p>}</div>
            {actions && <div className="kf-panel-actions">{actions}</div>}
          </div>
        )}
        <div className="kf-panel-body">{children}</div>
        {footer && <div className="kf-panel-footer">{footer}</div>}
      </div>
    );
  }
  ```
  Add `.kf-panel-footer` to `design.css`: `padding: 14px 20px; border-top: 1px solid
  var(--kf-border); display: flex; gap: 9px; justify-content: flex-end;`

  e) Add size variants `sm` and `lg` to `Button`: `min-height: 32px; padding: 6px 11px;
  font-size: 11px` for `sm`; `min-height: 46px; padding: 11px 20px; font-size: 14px` for `lg`. Add
  a `size` prop to the `ButtonProps` interface and apply `kf-btn--sm` / `kf-btn--lg` class
  conditionally. Add these two classes to `design.css`.

  TypeScript changes: `ButtonProps` adds `size?: "sm" | "md" | "lg"`.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\components\ui.tsx`
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\styles\design.css` (panel footer
    + button size classes)

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 8. **Redesign auth section in `App.tsx` — update token references only; no structural change**

  The auth JSX in `App.tsx` is already well-implemented (split card layout, password strength,
  Google sign-in, eye toggle, error states). The only changes needed:

  a) The inline `background` gradient on the auth showcase aside uses hardcoded hex colors. Replace
  those with CSS variables:
  - Replace `background: "rgba(255,255,255,0.06)"` in the feature section → keep (white on dark
    background, no token needed).
  - Replace `#1a4d2e` / `#205c36` / `#1f5e3a` literals that appear anywhere in the auth JSX
    inline styles with `var(--kf-forest)` / `var(--kf-forest-3)` / `var(--kf-action)`.

  b) Replace the `◌` character spinner with a `<Loader2>` icon at 18px with `className="kf-spin"`,
  matching the pattern in `ui.tsx`. Import `Loader2` from `lucide-react` (it is not currently
  imported in `App.tsx`).

  c) The auth page loading screen uses `<Leaf>` and a plain `<div className="kf-boot">`. Add the
  `kf-boot` CSS class to `App.css` (it is used but not defined in the files read):
  ```css
  .kf-boot {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: var(--kf-cream); gap: 10px; text-align: center;
  }
  .kf-boot h1 { font-size: 20px; margin: 0; color: var(--kf-forest); }
  .kf-boot p  { color: var(--kf-muted); font-size: 13px; margin: 0; }
  ```

  No changes to logic, form state, validation, Google sign-in flow, or routing.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\App.tsx`
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\App.css`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 9. **Redesign `HomeView.tsx` — add welcome banner, fix `.kf-split-bar` usage, ensure all
  classes exist**

  Edit `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\HomeView.tsx`:

  a) Add a welcome banner above the `PageHeader`:
  ```tsx
  <div className="kf-welcome-banner">
    <div>
      <p className="kf-eyebrow">Good {timeOfDayGreeting()}, farm manager</p>
      <h2 className="kf-welcome-title">Welcome back to Kagochi Farm</h2>
    </div>
  </div>
  ```
  where `timeOfDayGreeting()` is a local helper returning "morning" / "afternoon" / "evening" based
  on `new Date().getHours()`.

  b) The `.kf-split-bar` is already used inline in the existing code (population bar). Item 2
  defines its CSS. No JSX change needed for this element.

  c) The `.kf-record`, `.kf-record-head`, `.kf-record-title`, `.kf-record-icon`,
  `.kf-warning-list`, `.kf-warning-item` classes are used in `HomeView` but not defined in
  `design.css`. Add them:
  ```css
  .kf-welcome-banner { padding: 18px 0 8px; }
  .kf-welcome-title  { margin: 2px 0 0; font-size: 22px; font-weight: 780;
                        color: var(--kf-forest); letter-spacing: -0.03em; }
  .kf-record-list    { display: flex; flex-direction: column; gap: 2px; }
  .kf-record         { display: block; width: 100%; padding: 11px 12px;
                        border-radius: 10px; background: transparent;
                        border: 1px solid transparent; color: var(--kf-text);
                        transition: background 0.15s, border-color 0.15s; }
  .kf-record:hover   { background: var(--kf-cream-2); border-color: var(--kf-border); }
  .kf-record-head    { display: flex; align-items: center;
                        justify-content: space-between; gap: 12px; }
  .kf-record-title   { display: flex; align-items: center; gap: 10px; }
  .kf-record-icon    { width: 32px; height: 32px; display: grid; place-items: center;
                        border-radius: 9px; background: var(--kf-action-soft);
                        color: var(--kf-action); flex-shrink: 0; }
  .kf-record-title strong { display: block; font-size: 13px; font-weight: 650;
                             color: var(--kf-forest); }
  .kf-record-title span   { display: block; font-size: 11px; color: var(--kf-muted); }
  .kf-warning-list        { display: flex; flex-direction: column; gap: 8px; }
  .kf-warning-item        { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px;
                             border-radius: 10px; background: var(--kf-amber-soft);
                             border: 1px solid #f2dfbc; }
  .kf-warning-item strong { font-size: 13px; font-weight: 700; color: #78400a; }
  .kf-warning-item span   { font-size: 12px; color: #92500d; }
  ```
  Add all of the above to `design.css`.

  d) The `DailyRecordModal` component is preserved and rendered as-is.

  No data logic changes — all data-loading and filter logic is preserved exactly.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\HomeView.tsx`
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\styles\design.css`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 10. **Redesign `PoultryView.tsx` — migrate to `kf-*` class system, replace non-kf markup**

  Rewrite the JSX in `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\PoultryView.tsx`
  while keeping all existing state variables, validation logic, and API calls unchanged.

  Structure changes:
  - Replace `<div className="view-container">` with `<main className="kf-page">`.
  - Replace `.view-header-row` with `<PageHeader>` from `ui.tsx` (already imported pattern from
    HomeView). Import `PageHeader`, `StatCard`, `Panel`, `Button`, `Badge`, `Field`,
    `EmptyState`, `ErrorBanner` from `../components/ui`.
  - Replace `.poultry-kpi-grid` / `.kpi-card` divs with `<div className="kf-grid kf-grid--stats">
    <StatCard … />` (4 cards: current birds, chicks, layers/broilers, mortality).
  - Replace `.card-box.form-card` with `<Panel title="…">` wrapping the form.
  - Replace `.form-row-3` with `<div className="kf-form-grid">`.
  - Replace `.form-field` / `<label>` pairs with `<Field>` from ui.tsx where it adds value; for
    the datalist input, keep plain HTML inside a `<Field>`.
  - Replace `.daily-alert.error-alert` with `<ErrorBanner>` / `.daily-alert.success-alert` with
    `<Notice tone="success">`.
  - Replace `.card-box` (records section) with `<Panel>`.
  - Replace `.table-filter-pills` / `.filter-pill` with `<Segmented>` from ui.tsx.
  - Replace `.table-responsive` / `.modern-table` with `<div className="kf-table-wrap">
    <table className="kf-table">`.
  - Replace `.badge-stage.badge-{stage}` with `<Badge tone="…">`. Map stages:
    - chicks → tone `"amber"`, layers → tone `"green"`, broilers → tone `"blue"`,
    - kienyeji → tone `"forest"`, growers → tone `"slate"`, adult → tone `"slate"`.
  - Replace `.badge-loss.high-loss` / `.normal-loss` with `<Badge tone="red">` / `<Badge
    tone="slate">`.
  - Replace `.row-actions` / `.btn-icon` with `<div className="kf-actions-cell">
    <IconButton … />`.
  - Replace `.empty-state` with `<EmptyState>`.
  - Remove `ChickIcon`, `ChickenIcon` imports from `FarmIcons` for the KPI cards; use
    `<Bird size={20} />` and `<AlertTriangle size={20} />` from lucide-react (these are already
    imported in PoultryView). Keep the `FarmIcons` import only for the empty state icon if desired,
    or replace with `<Bird size={26} />` from lucide-react.
  - Replace the `alert()` calls with inline `setErrorMsg()` (the component already has `errorMsg`
    state — this is already done in PoultryView, no change needed).
  - Replace inline `window.confirm()` in `handleDelete` with a `Modal` confirmation dialog from
    ui.tsx. Add `deleteConfirm: { id: string; name: string } | null` state; render a `<Modal>`
    with two buttons (Cancel / Delete). This is the only logic addition.
  - The form `<button type="submit">` becomes `<Button type="submit" loading={saving}>`.
  - Import `Plus`, `Pencil` from lucide-react and use in button labels.

  TypeScript: no type changes needed — all existing types from `../types/farm` are preserved.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\PoultryView.tsx`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 11. **Redesign `LivestockView.tsx` — same migration pattern as PoultryView**

  Apply the same class-migration and component-substitution pattern as item 10 to
  `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\LivestockView.tsx`:

  - Replace `view-container` → `kf-page`, `view-header-row` → `PageHeader`, `card-box` → `Panel`.
  - Add `<div className="kf-grid kf-grid--stats">` with 4 `<StatCard>`s (Total cattle, Cows,
    Calves + Heifers, Bulls) using existing `countCalves`, `countHeifers`, `countCows`, `countBulls`
    state.
  - Category filter: `<Segmented>` with options all/calf/heifer/cow/bull.
  - Records table: `kf-table-wrap` + `kf-table`.
  - Category `<Badge>` tones: calf → `"amber"`, heifer → `"green"`, cow → `"forest"`, bull →
    `"blue"`, default → `"slate"`.
  - `CowIcon`, `CalfIcon`, `HeiferIcon` from `FarmIcons` can be kept for empty states; replace
    in KPI icons with `<Beef size={20} />` from lucide-react.
  - Replace `alert()` error handling with `setErrorMsg` state (add `errorMsg` state if not
    present; review the file — it already has `errorMsg` state).
  - `window.confirm` → `Modal` confirmation (same pattern as item 10).
  - Replace `.form-row-3` → `kf-form-grid`, `.form-field` → `Field`.
  - Replace `.btn-primary` / `.btn-secondary` → `Button` from ui.tsx.
  - Preserve all existing form fields, validation logic, and API calls (`loadLivestock`,
    `addLivestock`, `updateLivestock`, `deleteLivestock`).

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\LivestockView.tsx`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 12. **Redesign `ProductionView.tsx` — add summary cards, replace `alert()`, migrate to
  `kf-*` classes**

  Edit `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\ProductionView.tsx`:

  - Add KPI summary cards (computed from `records`):
    - Total eggs: `records.filter(r => r.type === "eggs").reduce((s,r) => s + r.quantity, 0)`
    - Total milk (litres): `records.filter(r => r.type === "milk").reduce((s,r) => s + r.quantity, 0)`
    - Records this month: count of records where `r.date` starts with current year-month
    - Last record date: `records[0]?.date ?? "—"` (records come sorted desc from API)
  - Replace the `alert()` calls with `errorMsg` / `successMsg` state (add these states).
  - Replace raw class names with `kf-*` equivalents (same pattern as items 10–11).
  - Add type filter `<Segmented>` with options: All, Eggs, Milk.
  - Records table with columns: Date, Type, Quantity, Unit, Destination, Selling Price, Notes,
    Actions. Use `kf-table-wrap` + `kf-table`.
  - Preserve `loadProduction`, `addProduction`, `updateProduction`, `deleteProduction` calls and
    all existing state.
  - TypeScript: the existing `ProductionRecord` type in `farm.ts` is sufficient; no new types.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\ProductionView.tsx`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 13. **Redesign `FeedingView.tsx` — add summary cards, replace `alert()`, migrate to
  `kf-*` classes**

  Edit `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\FeedingView.tsx`:

  - Add KPI summary cards:
    - Total kg fed: `records.filter(r => r.unit === "kg").reduce((s,r) => s + r.quantity, 0)`
    - Total bags fed: `records.filter(r => r.unit === "bags").reduce((s,r) => s + r.quantity, 0)`
    - Total feed cost: `records.reduce((s,r) => s + (r.cost || 0), 0)`
    - Records count
  - Replace `alert()` calls with inline error state.
  - Migrate all markup to `kf-*` classes (same pattern as items 10–11).
  - Add animal type filter `<Segmented>`: All, Poultry, Cattle.
  - Records table with columns: Date, Animal Type, Feed Type, Quantity, Unit, Cost, Supplier,
    Actions. Use `kf-table-wrap` + `kf-table`.
  - Add `cost`, `supplier`, `notes` form fields that are in the `FeedingRecord` type but may not
    currently appear in the form. Read the full file (offset 60+) for the existing fields and add
    only what the type declares and the form currently omits.
  - Preserve all API calls.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\FeedingView.tsx`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 14. **Redesign `ExpensesView.tsx` — migrate to `kf-*` classes, add category bar chart**

  Edit `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\ExpensesView.tsx`:

  - The view already has `activeTab` state for income/expense. Keep that `Segmented` control.
  - KPI summary bar: 3 stats side-by-side — Total Income, Total Expenses, Profit/Loss — using
    `StatCard`.
  - Category breakdown: use `<CssBar>` from ui.tsx (item 7) to show top-5 categories by amount
    for both income and expenses. Compute max as the highest single category amount.
  - Records table: Date, Category, Description, Amount, Actions. Use `kf-table-wrap` + `kf-table`.
  - Migrate all markup to `kf-*` classes.
  - Preserve all API calls (`loadExpenses`, `addExpense`, `updateExpense`, `deleteExpense`,
    `loadIncome`, `addIncome`, `updateIncome`, `deleteIncome`).
  - Replace `window.confirm` for delete → `Modal` confirmation pattern.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\ExpensesView.tsx`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 15. **Redesign `PerformanceView.tsx` — full `kf-*` migration, CSS bar charts, preserve CSV
  export**

  Edit `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\PerformanceView.tsx` (read
  the remainder from offset 100 before editing):

  - Wrap in `<main className="kf-page">` with `<PageHeader>` at top.
  - Period selector: `<Segmented>` with options Daily / Weekly / Monthly / Quarterly / Annual /
    Custom (keep existing `periodKey` state).
  - Custom date range: two `<input type="date">` fields in a `kf-filter-row`, shown only when
    `periodKey === "custom"`.
  - Financial summary: `<div className="kf-grid kf-grid--stats">` with 3 `StatCard`s — Income,
    Expenses, Profit/Loss.
  - Income by category: `<Panel title="Income breakdown">` containing a `<div
    className="kf-bar-chart">` with `<CssBar>` for each category. Max = highest income category
    amount. Tone = `"green"`. Show up to 8 categories.
  - Expense by category: same pattern, tone = `"red"`.
  - Population stats panel: `StatCard`s for total birds, total cattle, bird losses.
  - Production panel: `StatCard`s for eggs, milk with comparison to previous period via
    `trend` prop. Trend direction = `summary.production.lines[n].changePercent > 0 ? "up" :
    "down"`.
  - Feed usage panel: `StatCard`s for kg and bags.
  - Mortality summary: render `summary.population.poultry.lossPercent` as a `<CssBar>` showing
    the mortality rate with max=100. Tone = `"red"` if lossPercent > 5, else `"amber"`.
  - Preserve the `exportCSV()` function and the `<Button>` that calls it.
  - Error state: replace `setErrorMsg` alert with `<ErrorBanner>`.
  - All data from `loadFarmSummary`; no fake data.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\PerformanceView.tsx`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 16. **Redesign `AdvisorView.tsx` — modern chat interface with message bubbles, suggested
  questions, preserve `FarmChatbot`**

  Rewrite the JSX in `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\AdvisorView.tsx`
  while keeping all existing state variables and API calls (`getFarmAdvice`, `loadFarmSummary`):

  Structure:
  ```
  <main className="kf-page kf-page--narrow">
    <PageHeader title="AI Farm Advisor" … />
    <div className="kf-grid kf-grid--main-side" style={{ alignItems: 'start' }}>
      <div className="kf-stack">
        {/* period selector */}
        {/* rule-based warnings panel */}
        {/* advisory generation panel */}
        {/* FarmChatbot component */}
      </div>
      <div className="kf-stack">
        {/* suggested questions panel */}
        {/* farm summary stats panel */}
      </div>
    </div>
  </main>
  ```

  - Period selector: `<Segmented>` with Today / 7 days / 30 days mapped to `periodDays`.
  - Rule-based warnings: `<Panel>` with a `kf-warning-list` (same CSS from item 9) for
    `summary.rules`. If no rules: `<EmptyState compact>`.
  - Advisory generation panel: `<Panel>` with a `<Button loading={generating}>` "Generate
    advisory" button, and a preformatted result block. If not yet generated: `<EmptyState compact
    title="Generate an advisory report" description="…" />`. Error state: `<ErrorBanner>`.
  - Suggested questions panel: `<Panel title="Suggested questions">` with 5 preset question
    `<button>` chips (e.g. "How is my poultry mortality this week?", "What should I feed today?").
    These are visual only — clicking copies the question into the `FarmChatbot` input (pass an
    `onSuggest` prop to `FarmChatbot` if the component accepts it, or just render them as
    informational chips if not).
  - "AI advisor not available" graceful message: if the `error` state contains a specific phrase
    like "not configured" or the HTTP 503 / 404 response, show a prominent `<Notice tone="info">`
    explaining the advisor is not active in this deployment.
  - Keep `FarmChatbot` at the bottom of the left column unchanged.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\AdvisorView.tsx`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 17. **Redesign `VaccinationsView.tsx` — full `kf-*` migration, status badges, reminder
  sections**

  Read the remainder of `VaccinationsView.tsx` (from offset 80) before editing. Then rewrite the
  JSX while keeping all state, form fields, and API calls:

  - Wrap in `<main className="kf-page">` with `<PageHeader>`.
  - Tab control: keep `activeTab` state (reminders / schedules / add) wired to `<Segmented>`.
  - **Reminders tab**: split into three sections inside the panel:
    - Overdue vaccinations (tone red `<Badge>`)
    - Due today (tone amber)
    - Upcoming 7 days (tone green)
    - Completed (tone forest)
    Use `kf-table-wrap` + `kf-table` for each group; show `<EmptyState compact>` when a group
    is empty.
  - **Schedules tab**: table of `VaccinationSchedule` records with columns: Species, Category,
    Vaccine, Target Disease, Age (days), Booster interval, Actions.
  - **Add vaccination tab**: form fields per the `VaccinationRecord` type:
    Species, Target Name (free text + `targetId`), Vaccine Name, Disease, Date Due,
    Date Administered (optional), Dose, Count Vaccinated, Administered By, Status
    (select: scheduled/due/completed/overdue/cancelled), Notes.
    Use `<Field>` wrapper and `<Button loading={saving}>`.
  - Mark Done inline modal: keep the `markDoneId`, `markDoneDate`, `markDoneCount` state and
    render as a `<Modal>` from ui.tsx.
  - Status badge mapping:
    - `"overdue"` → `<Badge tone="red">`
    - `"due_today"` / `"due"` → `<Badge tone="amber">`
    - `"completed"` → `<Badge tone="green">`
    - `"upcoming"` / `"scheduled"` → `<Badge tone="blue">`
    - `"cancelled"` → `<Badge tone="slate">`
  - Preserve all API calls and schedule form state.

  Files to **modify**:
  - `c:\Users\kahosh\Desktop\kagochi_enterprise\frontend\src\views\VaccinationsView.tsx`

  Verify: `npm run build` — zero TypeScript errors.

---

- [ ] 18. **Build verification and fix pass**

  Run `npm run build` inside the frontend directory. Fix all TypeScript and Vite errors:

  - Common errors to anticipate:
    - Unused imports left over from old class names.
    - Missing `Button` `type` prop on submit buttons (TypeScript will flag since
      `ButtonHTMLAttributes` is extended — ensure `type` prop passed where needed).
    - The `Button` component accepts `...rest` spread of `ButtonHTMLAttributes`, so
      `<Button type="submit">` works — verify this.
    - Any `kf-spin` used on `Loader2` in App.tsx (Loader2 is not currently imported there — item 8
      adds it).
    - The `CssBar` `kf-bar-fill--` empty class: confirm the CSS logic described in item 7 produces
      `"kf-bar-fill"` not `"kf-bar-fill-- "`.
  - After all fixes, run `npm run build` a second time to confirm clean output.

  Files to **modify** (only as needed to fix build errors):
  - Any file that produced a TypeScript error.

  Verify: `npm run build` exits with code 0, zero errors, and produces output in `frontend/dist`.

---

## Digest

### Files created
| File | Purpose |
|---|---|
| `frontend/src/styles/tokens.css` | Single source of truth for all CSS design tokens |

### Files modified
| File | Block changed | What was verified |
|---|---|---|
| `frontend/src/main.tsx` | Import order — add `tokens.css` first | Build passes |
| `frontend/src/App.css` | Remove `:root` block, add `.kf-boot` | Build passes |
| `frontend/src/App.tsx` | Auth inline styles → CSS vars, `◌` → `<Loader2>` | Build passes |
| `frontend/src/styles/design.css` | Remove `:root` block; add sidebar desktop rule; `.kf-split-bar`; `.kf-bar-*`; `.kf-record*`; `.kf-warning-*`; mobile responsive; 44px touch targets; 16px mobile inputs; `.kf-bottom-nav` desktop hide; `.kf-panel-footer`; `.kf-btn--sm/lg`; `.kf-welcome-*` | Build passes |
| `frontend/src/components/Header.tsx` | Full rewrite — light bar, responsive, Bell icon | Build passes |
| `frontend/src/components/SideNav.tsx` | Icon mapping update, section labels, strokeWidth 1.5 | Build passes |
| `frontend/src/components/BottomNav.tsx` | Full rewrite — 5 tabs, correct icons | Build passes |
| `frontend/src/components/ui.tsx` | Add `Spinner`, `CssBar`, `Card`, `Button` size, `Modal` focus-trap | Build passes |
| `frontend/src/views/HomeView.tsx` | Welcome banner, `timeOfDayGreeting` helper | Build passes |
| `frontend/src/views/PoultryView.tsx` | Full JSX migration to kf-* + Modal confirm | Build passes |
| `frontend/src/views/LivestockView.tsx` | Full JSX migration to kf-* + Modal confirm | Build passes |
| `frontend/src/views/ProductionView.tsx` | Full JSX migration, alert→state, summary cards | Build passes |
| `frontend/src/views/FeedingView.tsx` | Full JSX migration, alert→state, summary cards | Build passes |
| `frontend/src/views/ExpensesView.tsx` | Full JSX migration, CssBar category breakdown | Build passes |
| `frontend/src/views/PerformanceView.tsx` | Full JSX migration, CssBar charts, preserve CSV | Build passes |
| `frontend/src/views/AdvisorView.tsx` | Chat UI structure, suggested questions, graceful error | Build passes |
| `frontend/src/views/VaccinationsView.tsx` | Full JSX migration, grouped reminder sections, Modal mark-done | Build passes |

### TypeScript types that change
- `frontend/src/components/ui.tsx`: `ButtonProps` gains `size?: "sm" | "md" | "lg"`
- `frontend/src/components/ui.tsx`: new exports `Spinner`, `CssBar`, `Card` (no changes to `farm.ts`)

### Build command
```
cd c:\Users\kahosh\Desktop\kagochi_enterprise\frontend
npm run build
```
Expected: exit code 0, output in `frontend/dist`, zero TypeScript errors.

### Dependency order
Items 1–3 (token layer) must complete before items 4–7 (components) which must complete before
items 8–17 (views). Item 18 (build fix) runs last. Within items 10–17, each view is independent
of the others — they may be done in any order once items 1–7 are done.
