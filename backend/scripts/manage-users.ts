/*
 * Account management from the command line (self-registration is off by default).
 *
 *   npm run users -- list
 *   npm run users -- create --name "Jane Farmer" --email jane@example.com [--role admin]
 *   npm run users -- set-role --email jane@example.com --role admin
 *   npm run users -- reset-password --email jane@example.com
 *
 * Passwords are typed at a hidden prompt (or read from KAGOCHI_NEW_PASSWORD
 * for automation) and are never passed as command-line arguments.
 */
import crypto from "crypto";
import readline from "readline";
import { parseArgs } from "util";
import { hashPassword } from "../src/auth.js";
import * as store from "../src/database.js";
import { newPassword } from "../src/schemas.js";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    output._writeToOutput = (s: string) => {
      if (s.includes(question)) output.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function readNewPassword(): Promise<string> {
  const fromEnv = process.env.KAGOCHI_NEW_PASSWORD;
  const password = fromEnv ?? (await promptHidden("New password: "));
  if (!fromEnv && password !== (await promptHidden("Repeat password: "))) fail("Passwords do not match.");
  const check = newPassword.safeParse(password);
  if (!check.success) fail(check.error.issues.map((i) => i.message).join(" "));
  return password;
}

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseRole(value: string | undefined): "farmer" | "admin" {
  if (value === undefined || value === "farmer") return "farmer";
  if (value === "admin") return "admin";
  fail('Role must be "farmer" or "admin".');
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { name: { type: "string" }, email: { type: "string" }, role: { type: "string" } },
});

const command = positionals[0];

switch (command) {
  case "list": {
    console.table(store.getAllUsers());
    break;
  }
  case "create": {
    if (!values.name || !values.email) fail("--name and --email are required.");
    if (store.findUserByEmail(values.email)) fail("An account with this email already exists.");
    const role = parseRole(values.role);
    const password = await readNewPassword();
    store.createUser(crypto.randomUUID(), values.name, values.email, await hashPassword(password), role);
    console.log(`Created ${role} account for ${values.email.toLowerCase()}.`);
    break;
  }
  case "set-role": {
    const user = values.email ? store.findUserByEmail(values.email) : undefined;
    if (!user) fail("No account with that email.");
    const role = parseRole(values.role);
    if (user.role === "admin" && role !== "admin" && store.countAdmins() <= 1) fail("Cannot demote the last administrator.");
    store.setUserRole(user.id, role);
    console.log(`${user.email} is now ${role}.`);
    break;
  }
  case "reset-password": {
    const user = values.email ? store.findUserByEmail(values.email) : undefined;
    if (!user) fail("No account with that email.");
    store.setUserPassword(user.id, await hashPassword(await readNewPassword()));
    console.log(`Password reset for ${user.email}. Existing sessions were signed out.`);
    break;
  }
  default:
    fail("Usage: npm run users -- <list|create|set-role|reset-password> [--name ..] [--email ..] [--role farmer|admin]");
}
