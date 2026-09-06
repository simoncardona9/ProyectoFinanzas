import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const membershipRole = pgEnum("membership_role", [
  "owner",
  "editor",
  "viewer",
  "accountant",
]);

export const accountType = pgEnum("account_type", [
  "cash",
  "bank",
  "card",
  "loan",
  "reserve_envelope",
]);

export const categoryKind = pgEnum("category_kind", [
  "income",
  "expense",
  "transfer",
]);

export const categoryClassification = pgEnum("category_classification", [
  "fixed",
  "variable",
  "discretionary",
]);

export const transactionType = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
  "debt_payment",
  "adjustment",
]);

export const transactionStatus = pgEnum("transaction_status", [
  "planned",
  "pending",
  "paid",
  "deferred",
  "cancelled",
]);

export const debtStatus = pgEnum("debt_status", [
  "active",
  "paid",
  "cancelled",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const households = pgTable("households", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  locale: text("locale").notNull().default("es-UY"),
  defaultCurrency: text("default_currency").notNull().default("UYU"),
  lowBufferMinor: integer("low_buffer_minor").notNull().default(0),
  timeZone: text("time_zone").notNull().default("America/Montevideo"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("memberships_user_household_unique").on(
      table.userId,
      table.householdId,
    ),
    index("memberships_household_idx").on(table.householdId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    activeHouseholdId: uuid("active_household_id").references(
      () => households.id,
      { onDelete: "set null" },
    ),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").references(() => households.id, {
    onDelete: "set null",
  }),
  actorUserId: uuid("actor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: accountType("type").notNull(),
    currency: text("currency").notNull(),
    openingBalanceMinor: integer("opening_balance_minor").notNull().default(0),
    openingBalanceDate: date("opening_balance_date").notNull(),
    active: boolean("active").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("accounts_household_active_idx").on(table.householdId, table.active),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: categoryKind("kind").notNull(),
    parentCategoryId: uuid("parent_category_id"),
    defaultClassification: categoryClassification("default_classification"),
    active: boolean("active").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("categories_household_active_idx").on(
      table.householdId,
      table.active,
    ),
    index("categories_parent_idx").on(table.parentCategoryId),
    foreignKey({
      columns: [table.parentCategoryId],
      foreignColumns: [table.id],
      name: "categories_parent_category_id_categories_id_fk",
    }).onDelete("restrict"),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    type: transactionType("type").notNull(),
    status: transactionStatus("status").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    isRecurring: boolean("is_recurring").notNull().default(false),
    isOneOff: boolean("is_one_off").notNull().default(false),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transactions_household_date_idx").on(table.householdId, table.date),
    index("transactions_account_date_idx").on(table.accountId, table.date),
    index("transactions_category_date_idx").on(table.categoryId, table.date),
  ],
);

export const obligations = pgTable(
  "obligations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    originalAmountMinor: integer("original_amount_minor").notNull(),
    remainingAmountMinor: integer("remaining_amount_minor").notNull(),
    currency: text("currency").notNull(),
    dueDate: date("due_date").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    classification: categoryClassification("classification").notNull(),
    status: transactionStatus("status").notNull().default("pending"),
    recurrenceRule: text("recurrence_rule"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("obligations_household_due_idx").on(table.householdId, table.dueDate),
    index("obligations_category_idx").on(table.categoryId),
  ],
);

export const obligationPayments = pgTable(
  "obligation_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id, { onDelete: "restrict" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "restrict" }),
    amountMinor: integer("amount_minor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("obligation_payments_transaction_unique").on(table.transactionId),
    index("obligation_payments_obligation_idx").on(table.obligationId),
  ],
);

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    creditorName: text("creditor_name").notNull(),
    description: text("description").notNull(),
    originalAmountMinor: integer("original_amount_minor").notNull(),
    remainingAmountMinor: integer("remaining_amount_minor").notNull(),
    currency: text("currency").notNull(),
    incurredDate: date("incurred_date").notNull(),
    status: debtStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("debts_household_status_idx").on(table.householdId, table.status),
    index("debts_household_currency_idx").on(table.householdId, table.currency),
  ],
);
