import { neon } from "@neondatabase/serverless";

type ColType = "string" | "datetime" | "int" | "boolean" | "json";

interface RelationDef {
  kind: "belongsTo" | "hasMany" | "hasOne";
  key: string;
  target: string;
  targetKey: string;
}

interface CountDef {
  target: string;
  targetKey: string;
}

interface ModelDef {
  table: string;
  pk: string;
  idGenerated: boolean;
  autoUpdatedAt: boolean;
  defaultNow: string[];
  columns: Record<string, ColType>;
  uniques: string[];
  compounds: Record<string, string[]>;
  relations: Record<string, RelationDef>;
  counts: Record<string, CountDef>;
}

const MODELS: Record<string, ModelDef> = {
  User: {
    table: "User",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: false,
    defaultNow: ["createdAt"],
    columns: {
      id: "string",
      email: "string",
      name: "string",
      handle: "string",
      nameChangedAt: "datetime",
      avatar: "string",
      title: "string",
      status: "string",
      passwordHash: "string",
      createdAt: "datetime",
    },
    uniques: ["email", "handle"],
    compounds: {},
    relations: {
      progress: { kind: "hasOne", key: "id", target: "ProgressProfile", targetKey: "userId" },
      completions: { kind: "hasMany", key: "id", target: "CourseCompletion", targetKey: "userId" },
    },
    counts: {
      followers: { target: "Follow", targetKey: "followedId" },
      following: { target: "Follow", targetKey: "followerId" },
    },
  },
  ProgressProfile: {
    table: "ProgressProfile",
    pk: "userId",
    idGenerated: false,
    autoUpdatedAt: true,
    defaultNow: [],
    columns: {
      userId: "string",
      data: "json",
      updatedAt: "datetime",
    },
    uniques: [],
    compounds: {},
    relations: {},
    counts: {},
  },
  CourseCompletion: {
    table: "CourseCompletion",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: false,
    defaultNow: ["completedAt"],
    columns: {
      id: "string",
      userId: "string",
      courseId: "string",
      title: "string",
      completedAt: "datetime",
    },
    uniques: [],
    compounds: { userId_courseId: ["userId", "courseId"] },
    relations: {},
    counts: {},
  },
  AuthAttempt: {
    table: "AuthAttempt",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: false,
    defaultNow: ["createdAt"],
    columns: {
      id: "string",
      key: "string",
      createdAt: "datetime",
    },
    uniques: [],
    compounds: {},
    relations: {},
    counts: {},
  },
  RateLimitEvent: {
    table: "RateLimitEvent",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: false,
    defaultNow: ["createdAt"],
    columns: {
      id: "string",
      key: "string",
      createdAt: "datetime",
    },
    uniques: [],
    compounds: {},
    relations: {},
    counts: {},
  },
  Question: {
    table: "Question",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: true,
    defaultNow: ["createdAt"],
    columns: {
      id: "string",
      authorId: "string",
      title: "string",
      body: "string",
      lessonSlug: "string",
      solved: "boolean",
      createdAt: "datetime",
      updatedAt: "datetime",
    },
    uniques: [],
    compounds: {},
    relations: {
      author: { kind: "belongsTo", key: "authorId", target: "User", targetKey: "id" },
      answers: { kind: "hasMany", key: "id", target: "QuestionAnswer", targetKey: "questionId" },
    },
    counts: {
      answers: { target: "QuestionAnswer", targetKey: "questionId" },
    },
  },
  QuestionAnswer: {
    table: "QuestionAnswer",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: false,
    defaultNow: ["createdAt"],
    columns: {
      id: "string",
      questionId: "string",
      authorId: "string",
      body: "string",
      createdAt: "datetime",
    },
    uniques: [],
    compounds: {},
    relations: {
      author: { kind: "belongsTo", key: "authorId", target: "User", targetKey: "id" },
    },
    counts: {},
  },
  WeeklyXp: {
    table: "WeeklyXp",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: true,
    defaultNow: [],
    columns: {
      id: "string",
      userId: "string",
      guestId: "string",
      name: "string",
      week: "string",
      xp: "int",
      updatedAt: "datetime",
    },
    uniques: [],
    compounds: {
      week_userId: ["week", "userId"],
      week_guestId: ["week", "guestId"],
    },
    relations: {
      user: { kind: "belongsTo", key: "userId", target: "User", targetKey: "id" },
    },
    counts: {},
  },
  WeeklyFirst: {
    table: "WeeklyFirst",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: false,
    defaultNow: ["settledAt"],
    columns: {
      id: "string",
      week: "string",
      userId: "string",
      settledAt: "datetime",
    },
    uniques: ["week"],
    compounds: {},
    relations: {},
    counts: {},
  },
  Notification: {
    table: "Notification",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: false,
    defaultNow: ["createdAt"],
    columns: {
      id: "string",
      userId: "string",
      localKey: "string",
      type: "string",
      title: "string",
      body: "string",
      link: "string",
      createdAt: "datetime",
      readAt: "datetime",
    },
    uniques: [],
    compounds: { userId_localKey: ["userId", "localKey"] },
    relations: {},
    counts: {},
  },
  FeedbackTicket: {
    table: "FeedbackTicket",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: false,
    defaultNow: ["openedAt"],
    columns: {
      id: "string",
      userId: "string",
      repo: "string",
      issueNumber: "int",
      title: "string",
      state: "string",
      closedMessage: "string",
      closedAt: "datetime",
      openedAt: "datetime",
    },
    uniques: [],
    compounds: { repo_issueNumber: ["repo", "issueNumber"] },
    relations: {},
    counts: {},
  },
  PollVote: {
    table: "PollVote",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: true,
    defaultNow: ["createdAt"],
    columns: {
      id: "string",
      pollId: "string",
      voterKey: "string",
      optionId: "string",
      createdAt: "datetime",
      updatedAt: "datetime",
    },
    uniques: [],
    compounds: { pollId_voterKey: ["pollId", "voterKey"] },
    relations: {},
    counts: {},
  },
  PollResult: {
    table: "PollResult",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: true,
    defaultNow: ["createdAt"],
    columns: {
      id: "string",
      pollId: "string",
      closesAt: "datetime",
      total: "int",
      winnerId: "string",
      issueUrl: "string",
      attempts: "int",
      createdAt: "datetime",
      updatedAt: "datetime",
    },
    uniques: [],
    compounds: {},
    relations: {},
    counts: {},
  },
  Follow: {
    table: "Follow",
    pk: "id",
    idGenerated: true,
    autoUpdatedAt: false,
    defaultNow: ["createdAt"],
    columns: {
      id: "string",
      followerId: "string",
      followedId: "string",
      createdAt: "datetime",
    },
    uniques: [],
    compounds: { followerId_followedId: ["followerId", "followedId"] },
    relations: {},
    counts: {},
  },
};

const PG_TO_PRISMA: Record<string, string> = {
  "23505": "P2002",
  "23503": "P2003",
  "23502": "P2011",
  "23514": "P2014",
  "22P02": "P2010",
  "42P01": "P2016",
  "40P01": "P2034",
  "40001": "P2034",
  "57014": "P2024",
};

function mapError(error: unknown): unknown {
  if (error instanceof Error && typeof (error as { code?: unknown }).code === "string") {
    const code = (error as { code?: unknown }).code as string;
    const mapped = PG_TO_PRISMA[code];
    if (mapped) {
      const next = new Error(error.message);
      (next as { code?: string }).code = mapped;
      return next;
    }
  }
  return error;
}

function genId(): string {
  return crypto.randomUUID();
}

function toDate(value: unknown): Date | null {
  if (value == null || value instanceof Date) return value as Date | null;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function writeValue(type: ColType | undefined, value: unknown): unknown {
  if (value == null) return null;
  if (type === "datetime") return value instanceof Date ? value.toISOString() : String(value);
  if (type === "json") return JSON.stringify(value);
  return value;
}

function readValue(type: ColType, value: unknown): unknown {
  if (type === "datetime") return toDate(value);
  if (type === "int") return value == null ? null : Number(value);
  return value;
}

function qid(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function renumber(sqlClause: string, offset: number): string {
  return sqlClause.replace(/\$(\d+)/g, (_match, n: string) => `$${Number(n) + offset}`);
}

function slotFor(type: ColType | undefined, slot: string): string {
  return type === "datetime" ? `${slot}::timestamptz` : slot;
}

function fieldClause(model: ModelDef, field: string, value: unknown): [string, unknown[]] {
  const type = model.columns[field];
  if (type === undefined) throw new Error(`Unknown field ${model.table}.${field}`);
  const col = qid(field);
  if (value == null) return [`${col} IS NULL`, []];
  if (typeof value === "object" && !(value instanceof Date)) {
    const ops = value as Record<string, unknown>;
    if ("in" in ops) {
      const list = Array.isArray(ops.in) ? ops.in : [];
      if (list.length === 0) return ["1 = 0", []];
      const params = list.map((item) => writeValue(type, item));
      const slots = params.map((_item, i) => slotFor(type, `$${i + 1}`)).join(", ");
      return [`${col} IN (${slots})`, params];
    }
    if ("gte" in ops) return [`${col} >= ${slotFor(type, "$1")}`, [writeValue(type, ops.gte)]];
    if ("lte" in ops) return [`${col} <= ${slotFor(type, "$1")}`, [writeValue(type, ops.lte)]];
    if ("lt" in ops) return [`${col} < ${slotFor(type, "$1")}`, [writeValue(type, ops.lt)]];
    if ("gt" in ops) return [`${col} > ${slotFor(type, "$1")}`, [writeValue(type, ops.gt)]];
    if ("equals" in ops) return [`${col} = ${slotFor(type, "$1")}`, [writeValue(type, ops.equals)]];
    if ("not" in ops) {
      if (ops.not == null) return [`${col} IS NOT NULL`, []];
      return [`${col} <> ${slotFor(type, "$1")}`, [writeValue(type, ops.not)]];
    }
    throw new Error(`Unsupported filter on ${model.table}.${field}`);
  }
  return [`${col} = ${slotFor(type, "$1")}`, [writeValue(type, value)]];
}

function whereClause(
  model: ModelDef,
  where?: Record<string, unknown>
): { sql: string; params: unknown[] } {
  if (!where) return { sql: "", params: [] };
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(where)) {
    if (key in model.columns) {
      const [subSql, subParams] = fieldClause(model, key, value);
      parts.push(subParams.length ? renumber(subSql, params.length) : subSql);
      params.push(...subParams);
    } else if (key in model.compounds) {
      const fields = model.compounds[key];
      if (value == null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Invalid compound where value for ${model.table}.${key}`);
      }
      for (const field of fields) {
        const fieldValue = (value as Record<string, unknown>)[field];
        const [subSql, subParams] = fieldClause(model, field, fieldValue);
        parts.push(subParams.length ? renumber(subSql, params.length) : subSql);
        params.push(...subParams);
      }
    } else {
      throw new Error(`Unknown where field ${model.table}.${key}`);
    }
  }
  return { sql: parts.join(" AND "), params };
}

function orderClause(
  model: ModelDef,
  orderBy?: Record<string, string> | Record<string, string>[]
): string {
  if (!orderBy) return "";
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts = list.map((entry) => {
    const field = Object.keys(entry)[0];
    if (!(field in model.columns)) throw new Error(`Unknown orderBy field ${model.table}.${field}`);
    const direction = String(entry[field]).toLowerCase() === "desc" ? "DESC" : "ASC";
    return `${qid(field)} ${direction}`;
  });
  return parts.join(", ");
}

function pick(row: Record<string, unknown>, select: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(select)) {
    out[key] = row[key];
  }
  return out;
}

function typeRow(model: ModelDef, raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, type] of Object.entries(model.columns)) {
    out[name] = readValue(type, raw[name]);
  }
  return out;
}

interface FindArgs {
  where?: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, string> | Record<string, string>[];
  take?: number;
}

type NeonRawResult = Record<string, unknown>[];

interface NeonSql {
  (text: string): Promise<NeonRawResult>;
  query(text: string, values?: unknown[]): Promise<NeonRawResult>;
}

/**
 * The Neon client is built on the first query rather than at module load.
 *
 * `neon()` throws when it is handed no connection string, and this module is
 * reached from the top of `src/lib/prisma.ts` on every host. Next evaluates
 * those imports while it collects page data during a build, so resolving the
 * client eagerly turned a missing DATABASE_URL into a failed build - on hosts
 * that legitimately have no database configured, and which
 * scripts/vercel-build.js promises can still deploy. Deferring it moves the
 * failure to the query that actually needs a client.
 */
let sql: NeonSql | null = null;

function getClient(): NeonSql {
  if (!sql) {
    const connectionString =
      process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "No database connection string was provided. Set DATABASE_URL_UNPOOLED or DATABASE_URL in the environment."
      );
    }
    sql = neon(connectionString) as unknown as NeonSql;
  }
  return sql;
}

async function run(query: string, params: unknown[]): Promise<NeonRawResult> {
  const client = getClient();
  try {
    const raw = (await client.query(query, params)) as unknown;
    if (Array.isArray(raw)) return raw as NeonRawResult;
    if (raw && typeof raw === "object" && Array.isArray((raw as { rows?: unknown }).rows)) {
      return (raw as { rows: NeonRawResult }).rows;
    }
    return [] as NeonRawResult;
  } catch (error) {
    throw mapError(error);
  }
}

async function attachCounts(
  model: ModelDef,
  rows: Record<string, unknown>[],
  countSelect: Record<string, unknown>
): Promise<void> {
  if (rows.length === 0) return;
  const pks = rows.map((row) => String(row[model.pk]));
  const maps: Record<string, Map<string, number>> = {};
  for (const [name] of Object.entries(countSelect)) {
    const def = model.counts[name];
    if (!def) continue;
    const target = MODELS[def.target];
    const slots = pks.map((_pk, i) => `$${i + 1}`).join(", ");
    const counted = await run(
      `SELECT ${qid(def.targetKey)} AS k, COUNT(*) AS c FROM ${qid(target.table)} WHERE ${qid(def.targetKey)} IN (${slots}) GROUP BY ${qid(def.targetKey)}`,
      pks
    );
    const map = new Map<string, number>();
    for (const row of counted) map.set(String(row.k), Number(row.c));
    maps[name] = map;
  }
  for (const row of rows) {
    const counts: Record<string, number> = {};
    for (const [name] of Object.entries(countSelect)) {
      const def = model.counts[name];
      counts[name] = def ? maps[name].get(String(row[model.pk])) ?? 0 : 0;
    }
    row._count = counts;
  }
}

async function loadRelations(
  model: ModelDef,
  rows: Record<string, unknown>[],
  select: Record<string, unknown>
): Promise<void> {
  for (const [name] of Object.entries(select)) {
    if (name === "_count") {
      const inner = (select[name] as { select?: Record<string, unknown> })?.select ?? {};
      await attachCounts(model, rows, inner);
      continue;
    }
    const rel = model.relations[name];
    if (!rel) continue;
    const spec = (select[name] ?? {}) as FindArgs;
    const relatedSelect = spec.select;
    const relatedOrder = spec.orderBy;
    const target = MODELS[rel.target];
    if (rel.kind === "belongsTo") {
      const keys = Array.from(
        new Set(rows.map((row) => row[rel.key]).filter((v) => v != null) as unknown[])
      );
      if (keys.length === 0) {
        for (const row of rows) row[name] = null;
        continue;
      }
      const found = await runFind(target, {
        where: { [target.pk]: { in: keys } },
        orderBy: relatedOrder,
      });
      if (relatedSelect) await loadRelations(target, found, relatedSelect);
      const index = new Map(found.map((row) => [String(row[target.pk]), row]));
      for (const row of rows) {
        const key = row[rel.key];
        const matched = key == null ? null : index.get(String(key)) ?? null;
        row[name] = relatedSelect && matched ? pick(matched, relatedSelect) : matched;
      }
    } else {
      const pks = Array.from(
        new Set(rows.map((row) => row[model.pk]).filter((v) => v != null) as unknown[])
      );
      if (pks.length === 0) {
        for (const row of rows) row[name] = rel.kind === "hasOne" ? null : [];
        continue;
      }
      const found = await runFind(target, {
        where: { [rel.targetKey]: { in: pks } },
        orderBy: relatedOrder,
      });
      if (relatedSelect) await loadRelations(target, found, relatedSelect);
      const groups = new Map<string, Record<string, unknown>[]>();
      for (const item of found) {
        const key = String(item[rel.targetKey]);
        const list = groups.get(key);
        if (list) list.push(item);
        else groups.set(key, [item]);
      }
      for (const row of rows) {
        let items = groups.get(String(row[model.pk])) ?? [];
        if (relatedSelect) items = items.map((item) => pick(item, relatedSelect));
        row[name] = rel.kind === "hasOne" ? (items[0] ?? null) : items;
      }
    }
  }
}

async function runFind(model: ModelDef, args: FindArgs): Promise<Record<string, unknown>[]> {
  const { sql, params } = whereClause(model, args.where);
  let query = `SELECT * FROM ${qid(model.table)}`;
  const allParams = [...params];
  if (sql) query += ` WHERE ${sql}`;
  const order = orderClause(model, args.orderBy);
  if (order) query += ` ORDER BY ${order}`;
  if (args.take != null) {
    query += ` LIMIT $${allParams.length + 1}`;
    allParams.push(Math.floor(args.take));
  }
  const raws = await run(query, allParams);
  const rows = raws.map((raw) => typeRow(model, raw));
  if (args.select) {
    await loadRelations(model, rows, args.select);
    return rows.map((row) => pick(row, args.select as Record<string, unknown>));
  }
  return rows;
}

async function findOne(
  model: ModelDef,
  where: Record<string, unknown>,
  select?: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const rows = await runFind(model, { where, select, take: 1 });
  return rows[0] ?? null;
}

function insertRow(model: ModelDef, data: Record<string, unknown>): { query: string; params: unknown[] } {
  const entries = Object.entries(data).filter(([key]) => key in model.columns);
  const present = new Set(entries.map(([key]) => key));
  if (model.idGenerated && !present.has(model.pk)) entries.push([model.pk, genId()]);
  if (model.autoUpdatedAt && !present.has("updatedAt")) entries.push(["updatedAt", new Date()]);
  for (const col of model.defaultNow) {
    if (!present.has(col)) entries.push([col, new Date()]);
  }
  const columns = entries.map(([key]) => qid(key));
  const params = entries.map(([key, value]) => writeValue(model.columns[key], value));
  const slots = params.map((_value, i) => `$${i + 1}`).join(", ");
  const query = `INSERT INTO ${qid(model.table)} (${columns.join(", ")}) VALUES (${slots}) RETURNING *`;
  return { query, params };
}

function updateSet(
  model: ModelDef,
  data: Record<string, unknown>,
  autoNow: boolean
): { parts: string[]; params: unknown[] } {
  const entries = Object.entries(data).filter(([key]) => key in model.columns && key !== model.pk);
  const present = new Set(entries.map(([key]) => key));
  if (autoNow && model.autoUpdatedAt && !present.has("updatedAt")) {
    entries.push(["updatedAt", new Date()]);
  }
  const parts = entries.map(([key], i) => `${qid(key)} = $${i + 1}`);
  const params = entries.map(([key, value]) => writeValue(model.columns[key], value));
  return { parts, params };
}

async function create(
  model: ModelDef,
  data: Record<string, unknown>,
  select?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { query, params } = insertRow(model, data);
  const raws = await run(query, params);
  const rows = raws.map((raw) => typeRow(model, raw));
  if (select) {
    await loadRelations(model, rows, select);
    return pick(rows[0], select);
  }
  return rows[0];
}

async function update(
  model: ModelDef,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  select?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { parts, params } = updateSet(model, data, true);
  const whereResult = whereClause(model, where);
  if (!whereResult.sql) throw new Error(`Missing where for ${model.table}.update`);
  const whereSql = renumber(whereResult.sql, params.length);
  const query = `UPDATE ${qid(model.table)} SET ${parts.join(", ")} WHERE ${whereSql} RETURNING *`;
  const raws = await run(query, [...params, ...whereResult.params]);
  if (raws.length === 0) {
    const err = new Error(`Record not found: ${model.table}`);
    (err as { code?: string }).code = "P2025";
    throw err;
  }
  const rows = raws.map((raw) => typeRow(model, raw));
  if (select) {
    await loadRelations(model, rows, select);
    return pick(rows[0], select);
  }
  return rows[0];
}

async function updateMany(
  model: ModelDef,
  where: Record<string, unknown>,
  data: Record<string, unknown>
): Promise<{ count: number }> {
  const { parts, params } = updateSet(model, data, false);
  const whereResult = whereClause(model, where);
  if (!whereResult.sql) throw new Error(`Missing where for ${model.table}.updateMany`);
  const whereSql = renumber(whereResult.sql, params.length);
  const query = `WITH updated AS (UPDATE ${qid(model.table)} SET ${parts.join(", ")} WHERE ${whereSql} RETURNING 1) SELECT COUNT(*)::int AS c FROM updated`;
  const raws = await run(query, [...params, ...whereResult.params]);
  return { count: Number(raws[0]?.c ?? 0) };
}

async function deleteMany(
  model: ModelDef,
  where: Record<string, unknown>
): Promise<{ count: number }> {
  const whereResult = whereClause(model, where);
  if (!whereResult.sql) throw new Error(`Missing where for ${model.table}.deleteMany`);
  const query = `WITH deleted AS (DELETE FROM ${qid(model.table)} WHERE ${whereResult.sql} RETURNING 1) SELECT COUNT(*)::int AS c FROM deleted`;
  const raws = await run(query, whereResult.params);
  return { count: Number(raws[0]?.c ?? 0) };
}

async function count(model: ModelDef, where?: Record<string, unknown>): Promise<number> {
  const whereResult = whereClause(model, where);
  const query = `SELECT COUNT(*)::int AS c FROM ${qid(model.table)}${whereResult.sql ? ` WHERE ${whereResult.sql}` : ""}`;
  const raws = await run(query, whereResult.params);
  return Number(raws[0]?.c ?? 0);
}

async function aggregate(
  model: ModelDef,
  where: Record<string, unknown> | undefined,
  sums: Record<string, unknown>
): Promise<{ _sum: Record<string, unknown> }> {
  const fields = Object.keys(sums).filter((field) => field in model.columns);
  if (fields.length === 0) throw new Error(`aggregate requires _sum fields on ${model.table}`);
  const selectParts = fields.map((field) => `SUM(${qid(field)}) AS ${qid(field)}`);
  const whereResult = whereClause(model, where);
  const query = `SELECT ${selectParts.join(", ")} FROM ${qid(model.table)}${whereResult.sql ? ` WHERE ${whereResult.sql}` : ""}`;
  const raw = (await run(query, whereResult.params))[0] ?? {};
  const _sum: Record<string, unknown> = {};
  for (const field of fields) {
    const value = raw[field];
    _sum[field] = value == null ? null : Number(value);
  }
  return { _sum };
}

async function upsert(
  model: ModelDef,
  where: Record<string, unknown>,
  createData: Record<string, unknown>,
  updateData: Record<string, unknown>,
  select?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const found = await findOne(model, where);
  if (found) {
    if (updateData && Object.keys(updateData).length > 0) {
      return update(model, where, updateData, select);
    }
    if (select) {
      const row = typeRow(model, found);
      await loadRelations(model, [row], select);
      return pick(row, select);
    }
    return found;
  }
  return create(model, createData, select);
}

async function queryRaw(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]> {
  let query = "";
  const params: unknown[] = [];
  strings.forEach((part, i) => {
    query += part;
    if (i < values.length) {
      params.push(values[i]);
      query += `$${params.length}`;
    }
  });
  return run(query, params);
}

async function transaction(operations: Array<PromiseLike<unknown>>): Promise<unknown[]> {
  const results: unknown[] = [];
  for (const operation of operations) {
    results.push(await operation);
  }
  return results;
}

function modelApi(name: string) {
  const model = (): ModelDef => MODELS[name];
  return {
    findUnique: (args: FindArgs & { where: Record<string, unknown> }) =>
      findOne(model(), args.where, args.select),
    findFirst: (args: FindArgs) => findOne(model(), args.where ?? {}, args.select),
    findMany: (args: FindArgs) => runFind(model(), args),
    create: (args: { data: Record<string, unknown>; select?: Record<string, unknown> }) =>
      create(model(), args.data, args.select),
    update: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
      select?: Record<string, unknown>;
    }) => update(model(), args.where, args.data, args.select),
    updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) =>
      updateMany(model(), args.where, args.data),
    deleteMany: (args: { where: Record<string, unknown> }) => deleteMany(model(), args.where),
    upsert: (args: {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
      select?: Record<string, unknown>;
    }) => upsert(model(), args.where, args.create, args.update, args.select),
    count: (args?: { where?: Record<string, unknown> }) => count(model(), args?.where),
    aggregate: (args: { where?: Record<string, unknown>; _sum?: Record<string, unknown> }) =>
      aggregate(model(), args.where, args._sum ?? {}),
  };
}

export const neonDb = {
  user: modelApi("User"),
  progressProfile: modelApi("ProgressProfile"),
  courseCompletion: modelApi("CourseCompletion"),
  authAttempt: modelApi("AuthAttempt"),
  rateLimitEvent: modelApi("RateLimitEvent"),
  question: modelApi("Question"),
  questionAnswer: modelApi("QuestionAnswer"),
  weeklyXp: modelApi("WeeklyXp"),
  weeklyFirst: modelApi("WeeklyFirst"),
  notification: modelApi("Notification"),
  feedbackTicket: modelApi("FeedbackTicket"),
  pollVote: modelApi("PollVote"),
  pollResult: modelApi("PollResult"),
  follow: modelApi("Follow"),
  $queryRaw: queryRaw,
  $transaction: transaction,
};