import crypto from "crypto";
import { existsSync } from "fs";
import { resolve } from "path";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import type { ZodType } from "zod";

import { config } from "./config.js";
import {
  SESSION_COOKIE,
  DUMMY_PASSWORD_HASH,
  type AuthUser,
  clearSessionCookieOptions,
  createSessionToken,
  hashPassword,
  sessionCookieOptions,
  verifyPassword,
  verifySessionToken,
} from "./auth.js";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adviceRequestSchema,
  chatRequestSchema,
  idParamSchema,
  loginSchema,
  registerSchema,
  resourceDefinitions,
  summaryQuerySchema,
  validationDetails,
} from "./schemas.js";
import { type AiClient, buildAdvicePrompt, buildChatPrompt, createGeminiClient } from "./ai.js";
import type { FarmStore, UserRow, ResourceName } from "./store.js";
import {
  buildFarmContextFromStore,
  loadFarmRecordsFromStore,
  today,
} from "./farmContextStore.js";
import { makePeriod, summarizeFarm } from "./analytics.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AppOptions {
  /** Database adapter selected by the server or tests. */
  store: FarmStore;

  /** Inject a fake AI client in tests; defaults to Gemini when GEMINI_API_KEY is set. */
  ai?: AiClient | null;
}

function publicUser(row: UserRow): AuthUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role === "admin" ? "admin" : "farmer" };
}

function parse<T>(schema: ZodType<T>, body: unknown, res: Response, message: string): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: message, details: validationDetails(result.error) });
    return null;
  }
  return result.data;
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === "SQLITE_CONSTRAINT_UNIQUE" || code === "23505";
}

export function createApp(options: AppOptions) {
  const store = options.store;
  const ai = options.ai === undefined ? createGeminiClient() : options.ai;
  const app = express();


  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type"],
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  /*
   * CSRF protection. The session cookie is SameSite=Strict, and any request
   * that changes data must come from an allowed origin (or the same host).
   */
  app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.get("origin");
    if (!origin) return next();
    const sameHost = origin === `${req.protocol}://${req.get("host")}`;
    if (sameHost || config.corsOrigins.includes(origin)) return next();
    res.status(403).json({ error: "Request origin is not allowed." });
  });

  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many failed login attempts. Please wait 15 minutes and try again." },
  });
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests. Please try again later.", fallback: true },
  });

  const api = express.Router();
  api.use(apiLimiter);

    async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const token = req.cookies?.[SESSION_COOKIE];
      const session =
        typeof token === "string" ? verifySessionToken(token) : null;

      const user = session
        ? await store.findUserById(session.userId)
        : undefined;

      if (
        !session ||
        !user ||
        user.token_version !== session.tokenVersion
      ) {
        if (token) {
          res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions());
        }
        res.status(401).json({ error: "Please log in to continue." });
        return;
      }

      req.user = publicUser(user);
      next();
    } catch (error) {
      next(error);
    }
  }

  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Administrator access is required." });
      return;
    }
    next();
  }

function startSession(res: Response, user: UserRow) {
    res.cookie(SESSION_COOKIE, createSessionToken(user.id, user.token_version), sessionCookieOptions());
  }

  /* -------------------------------- Health ------------------------------- */

  api.get("/health", (_req, res) => {
    res.json({ status: "ok", aiConfigured: Boolean(ai), registrationEnabled: config.allowRegistration });
  });

  /* --------------------------------- Auth -------------------------------- */

  api.post("/auth/login", loginLimiter, async (req, res) => {
    const data = parse(loginSchema, req.body, res, "Invalid email or password.");
    if (!data) return;
    const user = await store.findUserByEmail(data.email);
    const passwordOk = await verifyPassword(data.password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordOk) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    startSession(res, user);
    res.json({ user: publicUser(user) });
  });

  api.post("/auth/register", loginLimiter, async (req, res) => {
    if (!config.allowRegistration) {
      res.status(403).json({ error: "Self-registration is disabled. Ask the farm administrator to create your account." });
      return;
    }
    const data = parse(registerSchema, req.body, res, "Invalid registration details.");
    if (!data) return;
    if (await store.findUserByEmail(data.email)) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    const id = crypto.randomUUID();
    await store.createUser(
  id,
  data.name,
  data.email,
  await hashPassword(data.password),
);

if (data.farmName) {
  await store.createFarm(
    crypto.randomUUID(),
    id,
    data.farmName,
    data.location ?? "",
    data.phone ?? "",
  );
}

const user = await store.findUserById(id);

if (!user) {
  throw new Error("The newly created user could not be retrieved.");
}
    startSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  });

  api.post("/auth/logout", async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    const session = typeof token === "string" ? verifySessionToken(token) : null;
    if (session) await store.incrementTokenVersion(session.userId);
    res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions());
    res.json({ message: "Logged out." });
  });

  api.get("/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  /* ----------------------------- Farm records ---------------------------- */


  for (const resource of Object.keys(resourceDefinitions) as ResourceName[]) {
    const { label, schema, toColumns } = resourceDefinitions[resource];
    const path = `/farm/${resource}`;

    api.get(path, requireAuth, async (req, res) => {
      const records = await store.listRecords(resource, req.user!.id);
      res.json({ [resource]: records });
    });

    api.post(path, requireAuth, async (req, res) => {
      const data = parse(
        schema,
        req.body,
        res,
        `Invalid ${label.toLowerCase()} details.`,
      );
      if (!data) return;

      const id = crypto.randomUUID();

      await store.createRecord(
        resource,
        id,
        req.user!.id,
        toColumns(data as never),
      );

      res.status(201).json({ message: `${label} saved.`, id });
    });

    api.put(`${path}/:id`, requireAuth, async (req, res) => {
      const id = idParamSchema.safeParse(req.params.id);

      if (!id.success) {
        res.status(404).json({ error: `${label} not found.` });
        return;
      }

      const data = parse(
        schema,
        req.body,
        res,
        `Invalid ${label.toLowerCase()} details.`,
      );
      if (!data) return;

      const result = await store.updateRecord(
        resource,
        id.data,
        req.user!.id,
        toColumns(data as never),
      );

      if (result.changes === 0) {
        res.status(404).json({ error: `${label} not found.` });
        return;
      }

      res.json({ message: `${label} updated.` });
    });

    api.delete(`${path}/:id`, requireAuth, async (req, res) => {
      const id = idParamSchema.safeParse(req.params.id);

      const result = id.success
        ? await store.deleteRecord(resource, id.data, req.user!.id)
        : { changes: 0 };

      if (result.changes === 0) {
        res.status(404).json({ error: `${label} not found.` });
        return;
      }

      res.json({ message: `${label} deleted.` });
    });
  }


  /* ------------------------------- Analytics ------------------------------ */


  api.get("/farm/summary", requireAuth, async (req, res) => {
    const query = parse(
      summaryQuerySchema,
      req.query,
      res,
      "Invalid analytics period.",
    );
    if (!query) return;

    const period = makePeriod(query.to ?? today(), query.days);
    const records = await loadFarmRecordsFromStore(store, req.user!.id);

    res.json({
      summary: summarizeFarm(records, period),
    });
  });

  /* ---------------------------------- AI --------------------------------- */

  function aiUnavailable(res: Response, key: "advice" | "answer") {
    res.status(503).json({
      error: "The AI advisor is not configured on the server. Your farm records and rule-based checks are still available.",
      [key]: null,
      fallback: true,
    });
  }

  function aiFailed(res: Response, error: unknown, key: "advice" | "answer") {
    const status = (error as { status?: number })?.status;
    console.error("AI request failed:", status ?? "", (error as Error)?.message ?? "Unknown error");
    res.status(502).json({
      error:
        status === 429 || status === 503
          ? "The AI service is busy. Your farm records are safe. Please try again in a few minutes."
          : "The AI service could not answer right now. Please try again later.",
      [key]: null,
      fallback: true,
    });
  }

  api.post("/farm-advice", requireAuth, aiLimiter, async (req, res) => {
    const data = parse(adviceRequestSchema, req.body ?? {}, res, "Invalid AI request.");
    if (!data) return;
    if (!ai) return aiUnavailable(res, "advice");
    try {
      const context = await buildFarmContextFromStore(
  store,
  req.user!.id,
  data.periodDays ?? 30,
);
      const advice = await ai.generate(buildAdvicePrompt(context));
      res.json({ advice, fallback: false, periodDays: context.period.days });
    } catch (error) {
      aiFailed(res, error, "advice");
    }
  });

  api.post("/farm-chat", requireAuth, aiLimiter, async (req, res) => {
    const data = parse(chatRequestSchema, req.body, res, "Please enter a question of up to 1000 characters.");
    if (!data) return;
    if (!ai) return aiUnavailable(res, "answer");
    try {
      const context = await buildFarmContextFromStore(store, req.user!.id, 30);
      const answer = await ai.generate(buildChatPrompt(context, data.question, data.history ?? []));
      res.json({ answer, fallback: false });
    } catch (error) {
      aiFailed(res, error, "answer");
    }
  });

  /* -------------------------------- Admin -------------------------------- */


  api.get("/admin/users", requireAuth, requireAdmin, async (_req, res) => {
    res.json({ users: await store.getAllUsers() });
  });

  api.post("/admin/users", requireAuth, requireAdmin, async (req, res) => {
    const data = parse(adminCreateUserSchema, req.body, res, "Invalid account details.");
    if (!data) return;

    if (await store.findUserByEmail(data.email)) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const id = crypto.randomUUID();

    try {
      await store.createUser(
        id,
        data.name,
        data.email,
        await hashPassword(data.password),
        data.role,
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "An account with this email already exists." });
        return;
      }
      throw error;
    }

    res.status(201).json({ message: "Account created.", id });
  });

  api.put("/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const data = parse(adminUpdateUserSchema, req.body, res, "Invalid account details.");
    if (!data) return;

    const id = String(req.params.id);
    const target = await store.findUserById(id);

    if (!target) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (
      target.role === "admin" &&
      data.role !== "admin" &&
      (await store.countAdmins()) <= 1
    ) {
      res.status(409).json({ error: "The last administrator cannot be demoted." });
      return;
    }

    try {
      await store.adminUpdateUser(id, data.name, data.email, data.role);
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Another account already uses this email." });
        return;
      }
      throw error;
    }

    res.json({ message: "User updated." });
  });

  api.delete("/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = String(req.params.id);

    if (id === req.user!.id) {
      res.status(409).json({ error: "You cannot delete your own account while logged in." });
      return;
    }

    const result = await store.adminDeleteUser(id);

    if (result.changes === 0) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json({ message: "User and their farm records deleted." });
  });


  app.use("/api", api);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });

  /* Optional: serve the built frontend from the same origin in production. */
  if (config.frontendDist && existsSync(resolve(config.frontendDist, "index.html"))) {
    const dist = config.frontendDist;
    app.use(express.static(dist));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(resolve(dist, "index.html")));
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const type = (error as { type?: string })?.type;
    if (type === "entity.parse.failed") {
      res.status(400).json({ error: "Request body must be valid JSON." });
      return;
    }
    if (type === "entity.too.large") {
      res.status(413).json({ error: "Request body is too large." });
      return;
    }
    console.error("Unhandled server error:", (error as Error)?.message ?? error);
    res.status(500).json({ error: "An unexpected server error occurred." });
  });

  return app;
}
