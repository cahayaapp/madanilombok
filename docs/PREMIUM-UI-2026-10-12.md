# Madani shared visual system — 12 October 2026

The shared final stylesheet now standardizes operational page headers, panels, forms, tables, buttons, status colors, dialogs and responsive spacing. Application/admin stylesheet order is corrected; the entry screen keeps its approved identity. SW v90 refreshes the visual assets.

All 15 role homes share the user's latest reference composition: Madani tosca hero with identity/bell/avatar, greeting/name/role selector, floating Gregorian/Hijri date card, up to four gradient shortcuts and eight compact workspace shortcuts. Complete permitted menus remain accessible in the menu dialog. Existing home summary content (including financial summaries) remains under Semua Menu → Ringkasan & Informasi. Existing quick action handlers are moved intact; route authorization and finance mutations are unchanged. No KPI/Jurnal Liburan routes are enabled.

Name text is measured after font loading and on resize. It reduces from the responsive heading size, then wraps very long names to avoid truncation. The role selector remains below the name. Mobile browser zoom is allowed.

## Verification

- 35 role/rendering/login-worker tests passed: 221 workspace role/route render combinations, 157 legacy combinations, all 15 home roles, navigation role selection and targeted workflow assertions using fake repositories.
- Browser fixtures from real renderers: all 15 homes at 360×640 fit above bottom navigation without horizontal page overflow. Representative desktop home at 1280×800 and teacher home at 390×844 inspected visually.
- 16 representative operational pages inspected for horizontal overflow; forms, finance, mentoring and leadership examples included. Long operational lists remain scrollable.
- Long synthetic name measured at 360×640: 14px/two lines; name text fits available width and role button stays above the date card.
- JS syntax, 41 tracked JSON files and diff whitespace validated.

These are local fixture checks, not a claim that every populated live page/modal has been visually exercised. Live accounts, database records and access rules were not changed for the design work. Production requires successful publication of this commit; do not equate a local commit with deployment.
