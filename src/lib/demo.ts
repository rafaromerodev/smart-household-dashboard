/**
 * Public demo mode. It is on only when the demo credentials are configured, so a private
 * deployment is unaffected. The credentials are public on purpose: they open a household of
 * fictional data that scripts/demo-seed.mjs resets on a schedule.
 */
export const demo =
  process.env.NEXT_PUBLIC_DEMO_EMAIL && process.env.NEXT_PUBLIC_DEMO_PASSWORD
    ? { email: process.env.NEXT_PUBLIC_DEMO_EMAIL, password: process.env.NEXT_PUBLIC_DEMO_PASSWORD }
    : null;
