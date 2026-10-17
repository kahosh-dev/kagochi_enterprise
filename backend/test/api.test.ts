import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import request from "supertest";
import { FakeAi } from "./helpers.js";

const { createApp } = await import("../src/app.js");
const store = await import("../src/database.js");
const { hashPassword } = await import("../src/auth.js");

const PASSWORD = "Correct-horse-42";
const fakeAi = new FakeAi();
const app = createApp({ ai: fakeAi });
const today = new Date().toISOString().slice(0, 10);

async function makeUser(email: string, role: "farmer" | "admin" = "farmer") {
  const id = crypto.randomUUID();
  store.createUser(id, email.split("@")[0], email, await hashPassword(PASSWORD), role);
  return id;
}

async function loginAgent(email: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return agent;
}

let alice: ReturnType<typeof request.agent>;
let bob: ReturnType<typeof request.agent>;
let admin: ReturnType<typeof request.agent>;

before(async () => {
  await makeUser("alice@example.com");
  await makeUser("bob@example.com");
  await makeUser("admin@example.com", "admin");
  alice = await loginAgent("alice@example.com");
  bob = await loginAgent("bob@example.com");
  admin = await loginAgent("admin@example.com");
});

after(() => store.db.close());

describe("authentication", () => {
  it("sets an httpOnly, SameSite=Strict session cookie and does not return a token in the body", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "alice@example.com", password: PASSWORD });
    assert.equal(res.status, 200);
    assert.equal(res.body.token, undefined);
    assert.equal(res.body.user.email, "alice@example.com");
    assert.equal(res.body.user.password_hash, undefined);
    const cookie = String(res.headers["set-cookie"]);
    assert.match(cookie, /kagochi_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
  });

  it("gives the same error for wrong password and unknown email", async () => {
    const wrong = await request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "nope-nope-1" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "ghost@example.com", password: "nope-nope-1" });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
  });

  it("rejects protected endpoints without a session", async () => {
    for (const path of ["/api/auth/me", "/api/farm/poultry", "/api/admin/users"]) {
      const res = await request(app).get(path);
      assert.equal(res.status, 401, path);
    }
    const ai = await request(app).post("/api/farm-advice").send({});
    assert.equal(ai.status, 401);
  });

  it("rejects a forged session cookie", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "kagochi_session=eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.");
    assert.equal(res.status, 401);
  });

  it("logout revokes the session even if the old cookie is replayed", async () => {
    await makeUser("carol@example.com");
    const login = await request(app).post("/api/auth/login").send({ email: "carol@example.com", password: PASSWORD });
    const cookie = login.headers["set-cookie"] as unknown as string[];
    assert.equal((await request(app).get("/api/auth/me").set("Cookie", cookie)).status, 200);
    const out = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    assert.equal(out.status, 200);
    assert.match(String(out.headers["set-cookie"]), /kagochi_session=;/);
    assert.equal((await request(app).get("/api/auth/me").set("Cookie", cookie)).status, 401);
  });

  it("self-registration is disabled by default", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Eve", email: "eve@example.com", password: "Password1234" });
    assert.equal(res.status, 403);
    assert.equal(store.findUserByEmail("eve@example.com"), undefined);
  });

  it("the removed Google sign-in endpoint no longer exists", async () => {
    const res = await request(app).post("/api/auth/google").send({ credential: "a.b.c" });
    assert.equal(res.status, 404);
  });

  it("rejects state-changing requests from other origins", async () => {
    const res = await alice
      .post("/api/farm/expenses")
      .set("Origin", "https://evil.example")
      .send({ category: "Feed", description: "x", amount: 1, date: today });
    assert.equal(res.status, 403);
  });
});

describe("farm records", () => {
  it("creates, lists, updates and deletes a poultry batch", async () => {
    const body = { breed: "Kienyeji", purpose: "Layers", initialCount: 100, currentCount: 95, ageWeeks: 20, dateAdded: today };
    const created = await alice.post("/api/farm/poultry").send(body);
    assert.equal(created.status, 201);
    const id = created.body.id;

    const list = await alice.get("/api/farm/poultry");
    assert.equal(list.body.poultry.length, 1);
    assert.equal(list.body.poultry[0].current_count, 95);
    assert.equal(list.body.poultry[0].owner_id, undefined);

    const updated = await alice.put(`/api/farm/poultry/${id}`).send({ ...body, currentCount: 90 });
    assert.equal(updated.status, 200);
    assert.equal((await alice.get("/api/farm/poultry")).body.poultry[0].current_count, 90);

    assert.equal((await alice.delete(`/api/farm/poultry/${id}`)).status, 200);
    assert.equal((await alice.get("/api/farm/poultry")).body.poultry.length, 0);
  });

  it("stores a full ISO timestamp as a YYYY-MM-DD date", async () => {
    const res = await alice
      .post("/api/farm/livestock")
      .send({ name: "Daisy", type: "Cow", breed: "Friesian", ageYears: 3, dateAdded: new Date().toISOString() });
    assert.equal(res.status, 201);
    const rows = (await alice.get("/api/farm/livestock")).body.livestock;
    assert.equal(rows[0].date_added, today);
  });

  it("users cannot read, update or delete another user's records", async () => {
    const created = await alice.post("/api/farm/expenses").send({ category: "Feed", description: "Layers mash", amount: 3200, date: today });
    const id = created.body.id;
    assert.equal((await bob.get("/api/farm/expenses")).body.expenses.length, 0);
    const update = await bob.put(`/api/farm/expenses/${id}`).send({ category: "Feed", description: "hacked", amount: 1, date: today });
    assert.equal(update.status, 404);
    assert.equal((await bob.delete(`/api/farm/expenses/${id}`)).status, 404);
    const aliceRows = (await alice.get("/api/farm/expenses")).body.expenses;
    assert.equal(aliceRows[0].description, "Layers mash");
  });

  const invalid: [string, string, Record<string, unknown>][] = [
    ["poultry", "current count above initial", { breed: "A", purpose: "Layers", initialCount: 10, currentCount: 11, ageWeeks: 1, dateAdded: today }],
    ["poultry", "negative count", { breed: "A", purpose: "Layers", initialCount: 10, currentCount: -1, ageWeeks: 1, dateAdded: today }],
    ["production", "milk in pieces", { type: "milk", quantity: 5, unit: "pieces", date: today }],
    ["production", "unknown type", { type: "wool", quantity: 5, unit: "kg", date: today }],
    ["production", "zero quantity", { type: "eggs", quantity: 0, unit: "pieces", date: today }],
    ["feeding", "unknown unit", { animalType: "Poultry", feedType: "Mash", quantity: 5, unit: "sacks", date: today }],
    ["expenses", "future date", { category: "Feed", description: "x", amount: 10, date: "2999-01-01" }],
    ["expenses", "impossible date", { category: "Feed", description: "x", amount: 10, date: "2026-02-30" }],
    ["expenses", "amount as text", { category: "Feed", description: "x", amount: "10", date: today }],
    ["expenses", "empty description", { category: "Feed", description: "  ", amount: 10, date: today }],
  ];
  for (const [resource, name, body] of invalid) {
    it(`rejects invalid ${resource}: ${name}`, async () => {
      const res = await alice.post(`/api/farm/${resource}`).send(body);
      assert.equal(res.status, 400);
      assert.ok(Array.isArray(res.body.details) && res.body.details.length > 0);
    });
  }

  it("returns a JSON error (not a stack trace) for malformed JSON", async () => {
    const res = await alice.post("/api/farm/expenses").set("Content-Type", "application/json").send("{bad json");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Request body must be valid JSON.");
    assert.doesNotMatch(res.text, /at .*\.ts/);
  });
});

describe("analytics endpoint", () => {
  it("requires login and validates the period", async () => {
    assert.equal((await request(app).get("/api/farm/summary")).status, 401);
    assert.equal((await alice.get("/api/farm/summary?days=0")).status, 400);
    assert.equal((await alice.get("/api/farm/summary?days=30&to=2026-02-30")).status, 400);
  });

  it("returns a summary of the user's own records for the period", async () => {
    const res = await alice.get("/api/farm/summary?days=7");
    assert.equal(res.status, 200);
    assert.equal(res.body.summary.period.days, 7);
    assert.equal(res.body.summary.period.to, today);
    assert.equal(res.body.summary.expenses.total, 3200); // Alice's single expense from the farm-records tests
    assert.ok(Array.isArray(res.body.summary.rules));
  });
});

describe("admin authorization", () => {
  it("a farmer cannot list, edit or delete users", async () => {
    assert.equal((await alice.get("/api/admin/users")).status, 403);
    const bobId = store.findUserByEmail("bob@example.com")!.id;
    assert.equal((await alice.put(`/api/admin/users/${bobId}`).send({ name: "Bob", email: "bob@example.com", role: "admin" })).status, 403);
    assert.equal((await alice.delete(`/api/admin/users/${bobId}`)).status, 403);
    assert.ok(store.findUserByEmail("bob@example.com"));
  });

  it("an admin can list users without password hashes", async () => {
    const res = await admin.get("/api/admin/users");
    assert.equal(res.status, 200);
    assert.ok(res.body.users.length >= 3);
    assert.ok(res.body.users.every((u: Record<string, unknown>) => !("password_hash" in u)));
  });

  it("an admin can create an account that can then log in", async () => {
    const res = await admin.post("/api/admin/users").send({ name: "Dan", email: "dan@example.com", password: PASSWORD, role: "farmer" });
    assert.equal(res.status, 201);
    await loginAgent("dan@example.com");
  });

  it("the last admin cannot demote or delete themselves", async () => {
    const adminId = store.findUserByEmail("admin@example.com")!.id;
    assert.equal((await admin.put(`/api/admin/users/${adminId}`).send({ name: "Admin", email: "admin@example.com", role: "farmer" })).status, 409);
    assert.equal((await admin.delete(`/api/admin/users/${adminId}`)).status, 409);
  });
});

describe("AI advisor", () => {
  it("builds the prompt from the logged-in user's own records, without ids", async () => {
    await bob.post("/api/farm/production").send({ type: "eggs", quantity: 240, unit: "pieces", date: today });
    fakeAi.prompts = [];
    const res = await bob.post("/api/farm-advice").send({ farmData: { poultry: [{ breed: "INJECTED" }] } });
    assert.equal(res.status, 200);
    assert.equal(res.body.fallback, false);
    const prompt = fakeAi.prompts[0];
    assert.match(prompt, /240/);
    assert.doesNotMatch(prompt, /INJECTED/);
    assert.doesNotMatch(prompt, /Layers mash/); // Alice's data
    const bobId = store.findUserByEmail("bob@example.com")!.id;
    assert.ok(!prompt.includes(bobId));
    assert.doesNotMatch(prompt, /bob@example\.com/);
  });

  it("validates chat questions", async () => {
    assert.equal((await bob.post("/api/farm-chat").send({ question: "" })).status, 400);
    assert.equal((await bob.post("/api/farm-chat").send({ question: "x".repeat(1001) })).status, 400);
  });

  it("returns a friendly fallback when the AI service fails", async () => {
    fakeAi.failWith = { status: 503 };
    const res = await bob.post("/api/farm-chat").send({ question: "How are my hens doing?" });
    fakeAi.failWith = null;
    assert.equal(res.status, 502);
    assert.equal(res.body.fallback, true);
    assert.match(res.body.error, /busy/);
  });

  it("returns 503 with fallback when no AI key is configured", async () => {
    const noAiApp = createApp({ ai: null });
    const agent = request.agent(noAiApp);
    await agent.post("/api/auth/login").send({ email: "bob@example.com", password: PASSWORD });
    const res = await agent.post("/api/farm-advice").send({});
    assert.equal(res.status, 503);
    assert.equal(res.body.fallback, true);
  });
});

describe("rate limiting", () => {
  it("blocks repeated failed logins with 429", async () => {
    const limitedApp = createApp({ ai: null });
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await request(limitedApp).post("/api/auth/login").send({ email: "alice@example.com", password: "wrong-pass-1" })).status;
    }
    assert.equal(last, 429);
  });
});
