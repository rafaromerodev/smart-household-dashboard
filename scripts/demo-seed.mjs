// Creates or resets the public demo: two fictional accounts sharing one household full of
// invented data. Run it after deploying and on a schedule, so visitors' changes don't last.
//
//   SUPABASE_URL=...  SUPABASE_ANON_KEY=...  SUPABASE_SERVICE_ROLE_KEY=...
//   DEMO_EMAIL=...    DEMO_PASSWORD=...      node scripts/demo-seed.mjs
//
// The service-role key is only read from the environment and never printed or stored.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { seedHouseholdData } from "./lib/demo-data.mjs";

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
};
const URL = env("SUPABASE_URL");
const ANON = env("SUPABASE_ANON_KEY");
const DEMO_EMAIL = env("DEMO_EMAIL").toLowerCase();
const DEMO_PASSWORD = env("DEMO_PASSWORD");
// Nobody signs in as the partner, so it gets a fresh random password on every reset.
const PARTNER_EMAIL = DEMO_EMAIL.replace("@", "+partner@");
const PARTNER_PASSWORD = randomBytes(24).toString("base64url");

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, env("SUPABASE_SERVICE_ROLE_KEY"), options);

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/** Creates the account, or restores its password and confirms it if it already exists. */
async function ensureUser(email, password) {
  const { users } = await must(admin.auth.admin.listUsers({ perPage: 1000 }), "list users");
  const existing = users.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    await must(admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true }), "reset user");
    return existing.id;
  }
  const { user } = await must(admin.auth.admin.createUser({ email, password, email_confirm: true }), "create user");
  return user.id;
}

async function signedIn(email, password) {
  const client = createClient(URL, ANON, options);
  await must(client.auth.signInWithPassword({ email, password }), `sign in ${email}`);
  return client;
}

const demoId = await ensureUser(DEMO_EMAIL, DEMO_PASSWORD);
const partnerId = await ensureUser(PARTNER_EMAIL, PARTNER_PASSWORD);

// Remove the previous demo household (cascades to all its data) and any uploaded files.
const old = await must(admin.from("members").select("household_id").in("user_id", [demoId, partnerId]), "old members");
for (const householdId of new Set(old.map((m) => m.household_id))) {
  const files = await must(admin.storage.from("receipts").list(householdId), "list receipts");
  if (files.length) await must(admin.storage.from("receipts").remove(files.map((f) => `${householdId}/${f.name}`)), "remove receipts");
  await must(admin.from("households").delete().eq("id", householdId), "delete household");
}

const ana = await signedIn(DEMO_EMAIL, DEMO_PASSWORD);
const householdId = await must(ana.rpc("create_household", { p_name: "Casa demo", p_display_name: "Ana" }), "create household");
const { invite_code } = await must(ana.from("households").select("invite_code").eq("id", householdId).single(), "invite code");
const luis = await signedIn(PARTNER_EMAIL, PARTNER_PASSWORD);
await must(luis.rpc("join_household", { p_code: invite_code, p_display_name: "Luis" }), "join household");

const members = await must(ana.from("members").select("id,user_id"), "members");
await seedHouseholdData(ana, {
  members: {
    main: members.find((m) => m.user_id === demoId).id,
    partner: members.find((m) => m.user_id === partnerId).id,
  },
});
console.log("Demo household ready.");
