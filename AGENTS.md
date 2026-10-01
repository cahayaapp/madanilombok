# MadaniApp — default identity and protected scope

Read `CODEX-HANDOFF.md`, `docs/FEATURE-SCOPE.md`, and `docs/CAHAYA-PARITY.md` before changes to role workflows.

## User-approved default identity

- MadaniApp uses BSI-inspired tosca `#00A39D`, orange-gold accents, and warm ivory backgrounds.
- Keep the Madani M / gold dome logo in `assets/brand/logo.svg`, its PWA icons, and the reference-inspired entry page as the default identity.
- Apply `assets/css/brand-theme.css` last on application/public pages; `entry.css` owns the entry screen.
- Do not restore Cahaya's branding, institution name, colors, people, or database. Cahaya is a workflow/UI reference only.

## Current user instruction

Compare all existing Madani roles with Cahaya, implement missing role features and experience, and retain Madani's finance features. Preserve the existing finance module, ledger, wallets, cashier restrictions, stock, payments, void/refund behavior, and parent finance view. Do not migrate operational records from Cahaya or write to either live database as part of local implementation/testing.

## Latest scope clarification

- Jurnal Liburan and its staff monitoring are disabled for every role. Preserve existing records; do not enable their routes or writes.
- Rombel `homeroomStaffId` is labeled **Wali Kelas**. The Guru Wali mentoring role remains distinct.

## Verification

Run JavaScript syntax checks, JSON validation, role/route tests, and targeted workflow tests. Report verified behavior separately from outstanding parity gaps and production tests. Do not label a menu link or a generic form as full workflow parity.
