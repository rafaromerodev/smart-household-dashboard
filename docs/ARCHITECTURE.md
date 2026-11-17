# Architecture

## Stack

**Next.js 15 (App Router) + TypeScript + Supabase (PostgreSQL, Auth, Storage, Realtime), deployable to Vercel.**

- One codebase for desktop and phones (PWA). If a native app is ever needed, the database, authentication and everything in `src/lib/domain` can be reused as-is (for example from Expo / React Native).
- Supabase provides a relational database, accounts, private file storage, realtime updates and scheduled jobs (`pg_cron`) in a single service, which keeps the number of moving parts low.
- Authorization is enforced **in the database** with Row Level Security, not only in the UI. Holding the public anon key is not enough to read another household's data. `tests/integration/db.test.ts` checks this.

## Layers

```
src/lib/domain/      Pure, tested logic with no DB or UI: money, dates, savings, budgets,
                     pricing and discounts, receipts, recurrence, list-from-menu.
src/lib/supabase/    Supabase clients (server and browser) and generated schema types.
src/lib/actions.ts   Form validation (zod) and error translation.
src/lib/schedule.ts  Workout sessions (stored sessions + recurring weekly classes).
src/components/      Shared components: cards, bottom sheets, forms, navigation,
                     receipt picker, charts.
src/app/(app)/<module>/
  page.tsx           Screen (Server Component: reads the database on the server).
  actions.ts         Server Actions: create / update / delete, with validation.
  *-form.tsx         Forms (Client Components).
supabase/migrations/ Versioned SQL schema, the source of truth for the database.
```

Adding a module: one SQL migration with its table (with `household_id`, added to the RLS policy loop), a folder in `src/app/(app)/` and a link in `src/components/nav.tsx`. Other modules are untouched.

## Data model

Households and people: `households` (with `invite_code`) and `members` (one Supabase user → one person in one household, at most two per household).

Every data table has a `household_id`, filled in by `current_household_id()`, and the same RLS policy. Shared versus individual data:

- Expenses: `scope` (shared / personal) + `member_id` (who paid). Both members see everything and can filter.
- Chores: `assignee_id` (`null` = both).
- Workouts: `member_id`; the calendar is shared and filterable by person.
- Savings: `member_id` on every movement.

| Area | Tables |
|---|---|
| Expenses | `categories` (with subcategories), `expenses`, `expense_lines`, `budgets`, `receipts` |
| Savings | `savings_goals`, `savings_monthly_targets` (target history), `savings_movements` |
| Groceries | `stores`, `store_discount_rules`, `products`, `price_observations`, `inventory_items`, `recipes`, `recipe_ingredients`, `meal_plan`, `shopping_lists`, `shopping_items` |
| Workouts | `workout_series` (weekly classes), `workouts` |
| Chores | `tasks` |
| Alerts | `notifications` |

Some tables (`expense_lines`, `price_observations`, `store_discount_rules`) already exist for upcoming features, so the schema won't need restructuring later.

## Rules

- **Amounts in integer cents.** Never floating point.
- **Three kinds of "savings", never summed together:**
  1. *Put aside*: `savings_movements`. Real money. It is not an expense, so a transfer to savings doesn't count twice.
  2. *Under budget*: computed (`budget.ts → underBudget`) for closed months.
  3. *Bought better*: `pricing.ts → optimizationSaving`, marked as estimated or verified.
- **Monthly targets keep their history.** Changing the target inserts a row with `valid_from`, so past months keep their own target.
- **Receipts never double count.** If an expense has line items, a database trigger requires them to add up exactly to the total. Category reports use either the lines or the total, never both.
- **Duplicates.** The same file is detected by SHA-256 (unique per household). A different receipt with the same store, date and amount asks for explicit confirmation.
- **Store discounts.** The pricing engine applies label price → promotion → staff discount → effective price. It never applies a discount twice when the label already includes it, and it doesn't apply an unconfirmed discount. When it is unknown whether a discount stacks with promotions, it assumes it doesn't.
- **No made-up data.** There are no sample prices; the "weekly shop" card shows the real average of recorded receipts.

## Private files

Private `receipts` bucket, path `<household_id>/<uuid>.<ext>`, with per-household Storage policies. The browser uploads directly to Storage (the app server would cap requests at 4.5 MB) and receipts are viewed through signed URLs that expire after 5 minutes.

## Sync between members

- Everything lives in one database: what one person saves, the other sees on open or when the app returns to the foreground (data is reloaded on visibility change).
- The shopping list also updates **live** through Supabase Realtime, which matters when both people are in the supermarket.

## Scheduled jobs (planned)

They will run in Supabase (`pg_cron` + Edge Functions) or Vercel Cron, never depending on the app being open: alert generation, price lookups, cleanup of orphaned receipt files.
