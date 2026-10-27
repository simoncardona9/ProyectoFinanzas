import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, chmod, rm } from "node:fs/promises";
import pg from "pg";

const exec = promisify(execFile);
const quote = (name) => `"${name.replaceAll('"', '""')}"`;
async function fingerprint(pool) {
  await pool.query("SET TIME ZONE 'UTC'");
  const tables = (
    await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    )
  ).rows;
  const result = {};
  for (const { tablename } of tables) {
    result[tablename] = (
      await pool.query(
        `SELECT count(*)::int AS count, coalesce(md5(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text)), '') AS checksum FROM ${quote(tablename)} t`,
      )
    ).rows[0];
  }
  return result;
}

// Uses a private Unix socket and temporary cluster; no CREATEDB privilege on
// the application's source database and no Docker configuration are required.
export async function verifyLocalBackup(source, databaseUrl) {
  const directory = await mkdtemp("/tmp/finance-restore-");
  await chmod(directory, 0o700);
  let started = false;
  let restored;
  const { stdout: bin } = await exec("pg_config", ["--bindir"]);
  const binary = (name) => `${bin.trim()}/${name}`;
  const sourceUrl = new URL(databaseUrl);
  const sourceEnv = {
    ...process.env,
    PGHOST: sourceUrl.hostname,
    PGPORT: sourceUrl.port || "5432",
    PGUSER: decodeURIComponent(sourceUrl.username),
    PGPASSWORD: decodeURIComponent(sourceUrl.password),
    PGDATABASE: sourceUrl.pathname.slice(1),
  };
  const restoreEnv = {
    ...process.env,
    PGHOST: directory,
    PGPORT: "5432",
    PGUSER: "restore_auditor",
    PGDATABASE: "postgres",
    PGPASSWORD: "",
  };
  try {
    const before = await fingerprint(source);
    await exec(
      binary("pg_dump"),
      [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--file",
        `${directory}/audit.dump`,
      ],
      { env: sourceEnv },
    );
    await exec(binary("initdb"), [
      "-D",
      `${directory}/data`,
      "-U",
      "restore_auditor",
      "--auth=trust",
      "--no-locale",
      "--encoding=UTF8",
    ]);
    await exec(binary("pg_ctl"), [
      "-D",
      `${directory}/data`,
      "-l",
      `${directory}/server.log`,
      "-o",
      `-h '' -k ${directory}`,
      "-w",
      "start",
    ]);
    started = true;
    await exec(
      binary("pg_restore"),
      [
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
        "-d",
        "postgres",
        `${directory}/audit.dump`,
      ],
      { env: restoreEnv },
    );
    restored = new pg.Pool({
      host: directory,
      user: "restore_auditor",
      database: "postgres",
      max: 1,
    });
    assert.deepEqual(
      await fingerprint(restored),
      before,
      "Every public table count and row checksum must survive restore",
    );
    console.log(
      `PASS: isolated local restore verified ${Object.keys(before).length} public tables by count and checksum`,
    );
  } catch (error) {
    // Child process environments may contain passwords: never print them.
    throw new Error(
      `Local backup verification failed: ${error.code ?? error.message}`,
    );
  } finally {
    if (restored) await restored.end();
    if (started)
      await exec(binary("pg_ctl"), [
        "-D",
        `${directory}/data`,
        "-m",
        "immediate",
        "-w",
        "stop",
      ]);
    await rm(directory, { recursive: true, force: true });
  }
}
