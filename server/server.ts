import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  type AuthUser,
} from "./auth";

import {
  findUserByEmail,
  findUserById,
  createUser,
  createFarm,

  createPoultry,
  findPoultryByOwnerId,
  updatePoultry,
  deletePoultry,

  createLivestock,
  findLivestockByOwnerId,
  updateLivestock,
  deleteLivestock,

  createProduction,
  findProductionByOwnerId,
  updateProduction,
  deleteProduction,

  createFeeding,
  findFeedingByOwnerId,
  updateFeeding,
  deleteFeeding,

  createExpense,
  findExpensesByOwnerId,
  updateExpense,
  deleteExpense,

  getAllUsers,
  adminUpdateUser,
  adminDeleteUser,
} from "./database";

const app = express();
const port = 3001;

/*
|--------------------------------------------------------------------------
| SECURITY CONFIGURATION
|--------------------------------------------------------------------------
*/

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(
  cors({
    origin: "http://localhost:5173",
   methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(
  express.json({
    limit: "100kb",
  })
);

/*
|--------------------------------------------------------------------------
| ENVIRONMENT VARIABLES
|--------------------------------------------------------------------------
*/

const geminiApiKey =
  process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error(
    "ERROR: GEMINI_API_KEY is not configured."
  );

  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
});

/*
|--------------------------------------------------------------------------
| RATE LIMITERS
|--------------------------------------------------------------------------
*/

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error:
      "Too many AI requests. Please try again later.",
  },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error:
      "Too many authentication attempts. Please try again later.",
  },
});

/*
|--------------------------------------------------------------------------
| VALIDATION SCHEMAS
|--------------------------------------------------------------------------
*/

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100),

  email: z
    .string()
    .trim()
    .email()
    .max(150),

  password: z
    .string()
    .min(
      8,
      "Password must contain at least 8 characters."
    )
    .max(100),

  farmName: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .optional(),

  location: z
    .string()
    .trim()
    .max(200)
    .optional(),

  phone: z
    .string()
    .trim()
    .max(30)
    .optional(),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email(),

  password: z
    .string()
    .min(1)
    .max(100),
});

const chatRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1)
    .max(1000),

  farmData: z.object({
    poultry: z
      .array(z.unknown())
      .max(500),

    livestock: z
      .array(z.unknown())
      .max(500),

    production: z
      .array(z.unknown())
      .max(500),

    feeding: z
      .array(z.unknown())
      .max(500),

    expenses: z
      .array(z.unknown())
      .max(500),
  }),

  history: z
    .array(
      z.object({
        role: z.enum([
          "user",
          "assistant",
        ]),

        text: z
          .string()
          .max(3000),
      })
    )
    .max(10)
    .optional(),
});

/*
|--------------------------------------------------------------------------
| FARM RECORD VALIDATION
|--------------------------------------------------------------------------
*/

const poultrySchema = z.object({
  breed: z.string().trim().min(1).max(100),
  purpose: z.string().trim().min(1).max(100),
  initialCount: z.number().int().min(0).max(100000),
  currentCount: z.number().int().min(0).max(100000),
  ageWeeks: z.number().int().min(0).max(1000),
  dateAdded: z.string().min(1).max(50),
});

const livestockSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(100),
  breed: z.string().trim().min(1).max(100),
  ageYears: z.number().min(0).max(100),
  dateAdded: z.string().min(1).max(50),
});

const productionSchema = z.object({
  type: z.string().trim().min(1).max(50),
  quantity: z.number().min(0).max(100000000),
  unit: z.string().trim().min(1).max(50),
  date: z.string().min(1).max(50),
});

const feedingSchema = z.object({
  animalType: z.string().trim().min(1).max(100),
  feedType: z.string().trim().min(1).max(100),
  quantity: z.number().min(0).max(100000000),
  unit: z.string().trim().min(1).max(50),
  date: z.string().min(1).max(50),
});

const expenseSchema = z.object({
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(300),
  amount: z.number().min(0).max(1000000000),
  date: z.string().min(1).max(50),
});

/*
|--------------------------------------------------------------------------
| AUTHENTICATION TYPES
|--------------------------------------------------------------------------
*/

interface AuthenticatedRequest
  extends Request {
  user?: AuthUser;
}

/*
|--------------------------------------------------------------------------
| AUTHENTICATION MIDDLEWARE
|--------------------------------------------------------------------------
*/

function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authorization =
    req.headers.authorization;

  if (!authorization) {
    res.status(401).json({
      error: "Authentication required.",
    });

    return;
  }

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    res.status(401).json({
      error: "Invalid authentication format.",
    });

    return;
  }

  const token =
    authorization.substring(7);

  if (!token) {
    res.status(401).json({
      error: "Authentication token is missing.",
    });

    return;
  }

  const user =
    verifyToken(token);

  if (!user) {
    res.status(401).json({
      error:
        "Invalid or expired authentication token.",
    });

    return;
  }

  req.user = user;

  next();
}

/*
|--------------------------------------------------------------------------
| BASIC SERVER TEST
|--------------------------------------------------------------------------
*/

app.get(
  "/api/test",
  (_req, res) => {
    res.json({
      message:
        "Kagochi Farm AI backend is running.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

app.post(
  "/api/auth/register",
  authRateLimiter,
  async (req, res) => {
    try {
      const result =
        registerSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid registration details.",
        });

        return;
      }

      const {
        name,
        email,
        password,
        farmName,
        location,
        phone,
      } = result.data;

      const existingUser =
        findUserByEmail(email);

      if (existingUser) {
        res.status(409).json({
          error:
            "An account with this email already exists.",
        });

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Hash password
      |--------------------------------------------------------------------------
      */

      const passwordHash =
        await hashPassword(
          password
        );

      const userId =
        crypto.randomUUID();

      /*
      |--------------------------------------------------------------------------
      | Create user
      |--------------------------------------------------------------------------
      */

      createUser(
        userId,
        name,
        email,
        passwordHash
      );

      /*
      |--------------------------------------------------------------------------
      | Create farm profile if supplied
      |--------------------------------------------------------------------------
      */

      if (farmName) {
        createFarm(
          crypto.randomUUID(),
          userId,
          farmName,
          location ?? "",
          phone ?? ""
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Create JWT
      |--------------------------------------------------------------------------
      */

      const user: AuthUser = {
        id: userId,
        name: name.trim(),
        email: email
          .toLowerCase()
          .trim(),
      };

      const token =
        createToken(user);

      res.status(201).json({
        message:
          "Account created successfully.",

        token,

        user,
      });
    } catch (error: any) {
      console.error(
        "Registration error:",
        error?.message ??
          "Unknown error"
      );

      res.status(500).json({
        error:
          "Unable to create account.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

app.post(
  "/api/auth/login",
  authRateLimiter,
  async (req, res) => {
    try {
      const result =
        loginSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid email or password.",
        });

        return;
      }

      const {
        email,
        password,
      } = result.data;

      const user =
        findUserByEmail(email);

      /*
      |--------------------------------------------------------------------------
      | Do not reveal whether the email exists
      |--------------------------------------------------------------------------
      */

      if (!user) {
        res.status(401).json({
          error:
            "Invalid email or password.",
        });

        return;
      }

      const passwordCorrect =
        await verifyPassword(
          password,
          user.password_hash
        );

      if (!passwordCorrect) {
        res.status(401).json({
          error:
            "Invalid email or password.",
        });

        return;
      }

      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
      };

      const token =
        createToken(authUser);

      res.json({
        message:
          "Login successful.",

        token,

        user: authUser,
      });
    } catch (error: any) {
      console.error(
        "Login error:",
        error?.message ??
          "Unknown error"
      );

      res.status(500).json({
        error:
          "Unable to login.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
*/

app.get(
  "/api/auth/me",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const user =
        findUserById(
          req.user!.id
        );

      if (!user) {
        res.status(404).json({
          error:
            "User account was not found.",
        });

        return;
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error: any) {
      console.error(
        "Get user error:",
        error?.message ??
          "Unknown error"
      );

      res.status(500).json({
        error:
          "Unable to retrieve account.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POULTRY API
|--------------------------------------------------------------------------
*/

/*
| Get poultry records
*/

app.get(
  "/api/farm/poultry",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const poultry =
        findPoultryByOwnerId(
          req.user!.id
        );

      res.json({
        poultry,
      });
    } catch (error: any) {
      console.error(
        "Get poultry error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to retrieve poultry records.",
      });
    }
  }
);

/*
| Add poultry record
*/

app.post(
  "/api/farm/poultry",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        poultrySchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid poultry data.",
        });

        return;
      }

      const data = result.data;

      const id =
        crypto.randomUUID();

      createPoultry(
        id,
        req.user!.id,
        data.breed,
        data.purpose,
        data.initialCount,
        data.currentCount,
        data.ageWeeks,
        data.dateAdded
      );

      res.status(201).json({
        message:
          "Poultry record created.",
        id,
      });
    } catch (error: any) {
      console.error(
        "Create poultry error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to create poultry record.",
      });
    }
  }
);

/*
| Update poultry record
*/

app.put(
  "/api/farm/poultry/:id",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        poultrySchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid poultry data.",
        });

        return;
      }

      const data = result.data;

      const updateResult =
        updatePoultry(
          String(req.params.id),
          req.user!.id,
          data.breed,
          data.purpose,
          data.initialCount,
          data.currentCount,
          data.ageWeeks,
          data.dateAdded
        );

      if (updateResult.changes === 0) {
        res.status(404).json({
          error:
            "Poultry record not found.",
        });

        return;
      }

      res.json({
        message:
          "Poultry record updated.",
      });
    } catch (error: any) {
      console.error(
        "Update poultry error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to update poultry record.",
      });
    }
  }
);

/*
| Delete poultry record
*/

app.delete(
  "/api/farm/poultry/:id",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        deletePoultry(
          String(req.params.id),
          req.user!.id
        );

      if (result.changes === 0) {
        res.status(404).json({
          error:
            "Poultry record not found.",
        });

        return;
      }

      res.json({
        message:
          "Poultry record deleted.",
      });
    } catch (error: any) {
      console.error(
        "Delete poultry error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to delete poultry record.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LIVESTOCK API
|--------------------------------------------------------------------------
*/

app.get(
  "/api/farm/livestock",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const livestock =
        findLivestockByOwnerId(
          req.user!.id
        );

      res.json({
        livestock,
      });
    } catch (error: any) {
      console.error(
        "Get livestock error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to retrieve livestock records.",
      });
    }
  }
);

app.post(
  "/api/farm/livestock",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        livestockSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid livestock data.",
        });

        return;
      }

      const data = result.data;

      const id =
        crypto.randomUUID();

      createLivestock(
        id,
        req.user!.id,
        data.name,
        data.type,
        data.breed,
        data.ageYears,
        data.dateAdded
      );

      res.status(201).json({
        message:
          "Livestock record created.",
        id,
      });
    } catch (error: any) {
      console.error(
        "Create livestock error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to create livestock record.",
      });
    }
  }
);

/*
| Update livestock record
*/

app.put(
  "/api/farm/livestock/:id",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        livestockSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid livestock data.",
        });

        return;
      }

      const data = result.data;

      const updateResult =
        updateLivestock(
          String(req.params.id),
          req.user!.id,
          data.name,
          data.type,
          data.breed,
          data.ageYears,
          data.dateAdded
        );

      if (updateResult.changes === 0) {
        res.status(404).json({
          error:
            "Livestock record not found.",
        });

        return;
      }

      res.json({
        message:
          "Livestock record updated.",
      });
    } catch (error: any) {
      console.error(
        "Update livestock error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to update livestock record.",
      });
    }
  }
);

app.delete(
  "/api/farm/livestock/:id",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        deleteLivestock(
          String(req.params.id),
          req.user!.id
        );

      if (result.changes === 0) {
        res.status(404).json({
          error:
            "Livestock record not found.",
        });

        return;
      }

      res.json({
        message:
          "Livestock record deleted.",
      });
    } catch (error: any) {
      console.error(
        "Delete livestock error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to delete livestock record.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PRODUCTION API
|--------------------------------------------------------------------------
*/

app.get(
  "/api/farm/production",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const production =
        findProductionByOwnerId(
          req.user!.id
        );

      res.json({
        production,
      });
    } catch (error: any) {
      console.error(
        "Get production error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to retrieve production records.",
      });
    }
  }
);

app.post(
  "/api/farm/production",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        productionSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid production data.",
        });

        return;
      }

      const data = result.data;

      const id =
        crypto.randomUUID();

      createProduction(
        id,
        req.user!.id,
        data.type,
        data.quantity,
        data.unit,
        data.date
      );

      res.status(201).json({
        message:
          "Production record created.",
        id,
      });
    } catch (error: any) {
      console.error(
        "Create production error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to create production record.",
      });
    }
  }
);

/*
| Update production record
*/

app.put(
  "/api/farm/production/:id",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        productionSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid production data.",
        });

        return;
      }

      const data = result.data;

      const updateResult =
        updateProduction(
          String(req.params.id),
          req.user!.id,
          data.type,
          data.quantity,
          data.unit,
          data.date
        );

      if (updateResult.changes === 0) {
        res.status(404).json({
          error:
            "Production record not found.",
        });

        return;
      }

      res.json({
        message:
          "Production record updated.",
      });
    } catch (error: any) {
      console.error(
        "Update production error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to update production record.",
      });
    }
  }
);

app.delete(
  "/api/farm/production/:id",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        deleteProduction(
          String(req.params.id),
          req.user!.id
        );

      if (result.changes === 0) {
        res.status(404).json({
          error:
            "Production record not found.",
        });

        return;
      }

      res.json({
        message:
          "Production record deleted.",
      });
    } catch (error: any) {
      console.error(
        "Delete production error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to delete production record.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| FEEDING API
|--------------------------------------------------------------------------
*/

app.get(
  "/api/farm/feeding",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const feeding =
        findFeedingByOwnerId(
          req.user!.id
        );

      res.json({
        feeding,
      });
    } catch (error: any) {
      console.error(
        "Get feeding error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to retrieve feeding records.",
      });
    }
  }
);

app.post(
  "/api/farm/feeding",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        feedingSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid feeding data.",
        });

        return;
      }

      const data = result.data;

      const id =
        crypto.randomUUID();

      createFeeding(
        id,
        req.user!.id,
        data.animalType,
        data.feedType,
        data.quantity,
        data.unit,
        data.date
      );

      res.status(201).json({
        message:
          "Feeding record created.",
        id,
      });
    } catch (error: any) {
      console.error(
        "Create feeding error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to create feeding record.",
      });
    }
  }
);

/*
| Update feeding record
*/

app.put(
  "/api/farm/feeding/:id",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        feedingSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid feeding data.",
        });

        return;
      }

      const data = result.data;

      const updateResult =
        updateFeeding(
          String(req.params.id),
          req.user!.id,
          data.animalType,
          data.feedType,
          data.quantity,
          data.unit,
          data.date
        );

      if (updateResult.changes === 0) {
        res.status(404).json({
          error:
            "Feeding record not found.",
        });

        return;
      }

      res.json({
        message:
          "Feeding record updated.",
      });
    } catch (error: any) {
      console.error(
        "Update feeding error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to update feeding record.",
      });
    }
  }
);

app.delete(
  "/api/farm/feeding/:id",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        deleteFeeding(
          String(req.params.id),
          req.user!.id
        );

      if (result.changes === 0) {
        res.status(404).json({
          error:
            "Feeding record not found.",
        });

        return;
      }

      res.json({
        message:
          "Feeding record deleted.",
      });
    } catch (error: any) {
      console.error(
        "Delete feeding error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to delete feeding record.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| EXPENSE API
|--------------------------------------------------------------------------
*/

app.get(
  "/api/farm/expenses",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const expenses =
        findExpensesByOwnerId(
          req.user!.id
        );

      res.json({
        expenses,
      });
    } catch (error: any) {
      console.error(
        "Get expenses error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to retrieve expense records.",
      });
    }
  }
);

app.post(
  "/api/farm/expenses",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        expenseSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid expense data.",
        });

        return;
      }

      const data = result.data;

      const id =
        crypto.randomUUID();

      createExpense(
        id,
        req.user!.id,
        data.category,
        data.description,
        data.amount,
        data.date
      );

      res.status(201).json({
        message:
          "Expense record created.",
        id,
      });
    } catch (error: any) {
      console.error(
        "Create expense error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to create expense record.",
      });
    }
  }
);

/*
| Update expense record
*/

app.put(
  "/api/farm/expenses/:id",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        expenseSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid expense data.",
        });

        return;
      }

      const data = result.data;

      const updateResult =
        updateExpense(
          String(req.params.id),
          req.user!.id,
          data.category,
          data.description,
          data.amount,
          data.date
        );

      if (updateResult.changes === 0) {
        res.status(404).json({
          error:
            "Expense record not found.",
        });

        return;
      }

      res.json({
        message:
          "Expense record updated.",
      });
    } catch (error: any) {
      console.error(
        "Update expense error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to update expense record.",
      });
    }
  }
);

app.delete(
  "/api/farm/expenses/:id",
  requireAuth,
  (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        deleteExpense(
          String(req.params.id),
          req.user!.id
        );

      if (result.changes === 0) {
        res.status(404).json({
          error:
            "Expense record not found.",
        });

        return;
      }

      res.json({
        message:
          "Expense record deleted.",
      });
    } catch (error: any) {
      console.error(
        "Delete expense error:",
        error?.message
      );

      res.status(500).json({
        error:
          "Unable to delete expense record.",
      });
    }
  }
);



/*
|--------------------------------------------------------------------------
| FARM AI ADVICE
|--------------------------------------------------------------------------
*/

app.post(
  "/api/farm-advice",
  requireAuth,
  aiRateLimiter,
  async (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const { farmData } =
        req.body;

      if (!farmData) {
        res.status(400).json({
          error:
            "Farm data is required.",
        });

        return;
      }

      const prompt = `
You are an AI farm decision-support assistant.

The user manages a poultry and livestock farm.

Use simple, practical language that a farmer can understand.

Analyse the following farm data:

${JSON.stringify(
  farmData,
  null,
  2
)}

Provide:

1. Important observations
2. Areas requiring attention
3. Practical recommendations

Do not invent data that was not provided.

Remember that you provide decision support,
not professional veterinary or agricultural diagnosis.
`;

      let response;

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {
        try {
          response =
            await ai.models.generateContent({
              model:
                "gemini-3.5-flash-lite",

              contents: prompt,
            });

          break;
        } catch (error: any) {
          console.log(
            `AI attempt ${attempt} failed.`
          );

          if (
            attempt === 3
          ) {
            throw error;
          }

          const delay =
            attempt * 3000;

          console.log(
            `Retrying in ${
              delay / 1000
            } seconds...`
          );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                delay
              )
          );
        }
      }

      res.json({
        advice:
          response?.text ??
          "No AI response was generated.",

        fallback: false,
      });
    } catch (error: any) {
      console.error(
        "Gemini AI error:",
        error?.message ??
          "Unknown error"
      );

      if (
        error?.status === 503
      ) {
        res.json({
          advice:
            "The AI service is temporarily busy. Your farm records are still available. Please try again shortly.",

          fallback: true,
        });

        return;
      }

      res.status(500).json({
        error:
          "Unable to generate AI advice.",

        fallback: true,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| FARM AI CHAT
|--------------------------------------------------------------------------
*/

app.post(
  "/api/farm-chat",
  requireAuth,
  aiRateLimiter,
  async (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const result =
        chatRequestSchema.safeParse(
          req.body
        );

      if (!result.success) {
        res.status(400).json({
          error:
            "Invalid request data.",
        });

        return;
      }

      const {
        question,
        farmData,
        history = [],
      } = result.data;

      const conversationHistory =
        history
          .slice(-10)
          .map(
            (message) =>
              `${
                message.role ===
                "user"
                  ? "Farmer"
                  : "AI Assistant"
              }: ${
                message.text
              }`
          )
          .join("\n");

      const prompt = `
You are the Kagochi Farm AI Assistant.

You are a practical decision-support assistant
for a poultry and livestock farm.

Your users may be farmers, farm workers,
or small and medium enterprise (MSME) owners
who may not have technical knowledge.

IMPORTANT RULES:

1. Use simple, clear and practical language.

2. Answer the farmer's actual question directly.

3. Use the farm records provided below when relevant.

4. Do not invent farm data.

5. If information is missing, clearly say
   what information is needed.

6. Give practical steps that the farmer can follow.

7. Do not present uncertain information
   as guaranteed fact.

8. For serious animal problems or situations
   requiring professional assessment,
   recommend consulting a qualified veterinarian,
   livestock officer, or agricultural professional.

9. Do not claim to diagnose diseases.

10. Keep answers reasonably concise
    and easy to understand.

11. Remember that this system provides
    decision support, not professional
    veterinary or agricultural diagnosis.

CURRENT FARM RECORDS:

${JSON.stringify(
  farmData,
  null,
  2
)}

PREVIOUS CONVERSATION:

${
  conversationHistory ||
  "No previous conversation."
}

CURRENT FARMER QUESTION:

${question}

Provide a helpful answer to the farmer.
`;

      let response;

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {
        try {
          response =
            await ai.models.generateContent({
              model:
                "gemini-3.5-flash-lite",

              contents: prompt,
            });

          break;
        } catch (error: any) {
          console.log(
            `Chat AI attempt ${attempt} failed.`
          );

          if (
            attempt === 3
          ) {
            throw error;
          }

          const delay =
            attempt * 3000;

          console.log(
            `Retrying chat AI in ${
              delay / 1000
            } seconds...`
          );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                delay
              )
          );
        }
      }

      res.json({
        answer:
          response?.text ??
          "No response was generated. Please try again.",

        fallback: false,
      });
    } catch (error: any) {
      console.error(
        "Farm chat AI error:",
        error?.message ??
          "Unknown error"
      );

      if (
        error?.status === 503
      ) {
        res.json({
          answer:
            "The AI service is temporarily busy. Please try again shortly.",

          fallback: true,
        });

        return;
      }

      res.status(500).json({
        error:
          "Unable to communicate with the farm AI.",

        fallback: true,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GOOGLE SIGN-IN
|--------------------------------------------------------------------------
*/

const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

app.post(
  "/api/auth/google",
  authRateLimiter,
  async (req, res) => {
    try {
      const result = googleAuthSchema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({ error: "Invalid Google credential." });
        return;
      }

      // Decode the JWT payload from Google (no verification needed for demo;
      // in production use google-auth-library to verify the token).
      const parts = result.data.credential.split(".");

      if (parts.length !== 3) {
        res.status(400).json({ error: "Invalid Google token format." });
        return;
      }

      let payload: { email?: string; name?: string; sub?: string };

      try {
        payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf8")
        );
      } catch {
        res.status(400).json({ error: "Unable to read Google token." });
        return;
      }

      const { email, name, sub } = payload;

      if (!email || !name || !sub) {
        res.status(400).json({ error: "Incomplete Google profile." });
        return;
      }

      let user = findUserByEmail(email);

      if (!user) {
        const userId = crypto.randomUUID();
        const dummyHash = await hashPassword(sub + process.env.JWT_SECRET);
        createUser(userId, name, email, dummyHash);
        user = findUserByEmail(email)!;
      }

      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
      };

      const token = createToken(authUser);

      res.json({ message: "Google sign-in successful.", token, user: authUser });
    } catch (error: any) {
      console.error("Google auth error:", error?.message ?? "Unknown error");
      res.status(500).json({ error: "Google sign-in failed." });
    }
  }
);

/*
|--------------------------------------------------------------------------
| ADMIN — USER MANAGEMENT
|--------------------------------------------------------------------------
*/

const adminUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
});

/* List all users */

app.get(
  "/api/admin/users",
  requireAuth,
  (_req: AuthenticatedRequest, res) => {
    try {
      const users = getAllUsers();
      res.json({ users });
    } catch (error: any) {
      console.error("Admin get users error:", error?.message);
      res.status(500).json({ error: "Unable to retrieve users." });
    }
  }
);

/* Update a user */

app.put(
  "/api/admin/users/:id",
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    try {
      const result = adminUpdateSchema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({ error: "Invalid user data." });
        return;
      }

      const updateResult = adminUpdateUser(
        String(req.params.id),
        result.data.name,
        result.data.email
      );

      if (updateResult.changes === 0) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      res.json({ message: "User updated." });
    } catch (error: any) {
      console.error("Admin update user error:", error?.message);
      res.status(500).json({ error: "Unable to update user." });
    }
  }
);

/* Delete a user */

app.delete(
  "/api/admin/users/:id",
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    try {
      const result = adminDeleteUser(String(req.params.id));

      if (result.changes === 0) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      res.json({ message: "User deleted." });
    } catch (error: any) {
      console.error("Admin delete user error:", error?.message);
      res.status(500).json({ error: "Unable to delete user." });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(
  (
    _err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    res.status(500).json({
      error:
        "An unexpected server error occurred.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

app.listen(
  port,
  () => {
    console.log(
      `Kagochi Farm AI backend running on http://localhost:${port}`
    );
  }
);