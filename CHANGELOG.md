# Changelog

All notable changes to the **Jay's Kitchen** Restaurant Expense Management System are documented here.

## [1.0.0] - 2026-07-05

### Added
* **Expense Dashboard**: Premium, unified layout featuring real-time key metrics (Total Bills, Total Expenses, and category summaries), transaction activity trackers, and interactive Recharts data graphs.
* **Granular Filters**: Advanced time-period query filters (From/To dates) and user status switches.
* **Unified Settings Console**: Admin controls to update restaurant configuration metadata, vendor indices, categories (with color palettes), payment instruments, and user rosters.
* **Bulk Action Controls**: Support for multi-selection list removals, status updates, and bulk downloads.
* **Audit Logger**: Backend tracking mechanism log hooks that record model changes (Create/Update/Delete) for security tracing.
* **Public Form Page**: Clean page for receipt submissions without auth, suited for staff tablets.

### Changed
* **Supabase Storage Integration**: Migrated from Cloudinary to Supabase Storage Bucket for robust attachment and receipt image handling.
* **Parallel API Aggregations**: Consolidated server query fetches under `Promise.all` structures in API routes to minimize database latency.
* **Responsive Layout Redesign**: Verified breakpoints spanning 320px (iPhone SE) to 1920px (large monitors). COLLAPSIBLE navigation toggles on mobile formats.
* **Touch Target Hardening**: Set minimum tap boundaries of `44px` for input boxes and click buttons in CSS styles.

### Fixed
* **Safe Seeding Passwords**: Shifted default admin seeding credentials to use environment variables (`INITIAL_SUPER_ADMIN_PASSWORD` and `INITIAL_ADMIN_PASSWORD`).
* **Bcrypt Optimization**: Swapped salt rounds to `10` to accelerate authentication validation, saving CPU load.
* **Dynamic height layout bugs**: Replaced static screen viewport heights with `100dvh` units to fix Safari scrolling bugs.
* **Case-Insensitive Searching**: Enhanced query matches to ignore letter casing for vendor and bill lookups on Postgres.
* **Image viewer fallback crashes**: Replaced standard next/image tags with native HTML img elements inside drawers to support offline files.
