import argon2 from "argon2";
import pg from "pg";

const requiredEnvironment = [
  "DATABASE_URL",
  "TEST_USER_EMAIL",
  "TEST_USER_PASSWORD",
  "TEST_HOUSEHOLD_NAME",
];

for (const name of requiredEnvironment) {
  if (!process.env[name]?.trim()) {
    throw new Error(`${name} is required to seed the local test user.`);
  }
}

const email = process.env.TEST_USER_EMAIL.trim().toLowerCase();
const password = process.env.TEST_USER_PASSWORD;
const householdName = process.env.TEST_HOUSEHOLD_NAME.trim();

if (!email.includes("@")) {
  throw new Error("TEST_USER_EMAIL must be an email address.");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19 * 1024,
    timeCost: 2,
    parallelism: 1,
  });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             is_active = true,
             updated_at = now()
       RETURNING id`,
      [email, passwordHash],
    );
    const userId = userResult.rows[0].id;

    const existingHousehold = await client.query(
      `SELECT h.id
       FROM households h
       INNER JOIN memberships m ON m.household_id = h.id
       WHERE m.user_id = $1 AND h.name = $2
       LIMIT 1`,
      [userId, householdName],
    );
    let householdId = existingHousehold.rows[0]?.id;

    if (!householdId) {
      const householdResult = await client.query(
        `INSERT INTO households (name)
         VALUES ($1)
         RETURNING id`,
        [householdName],
      );
      householdId = householdResult.rows[0].id;
    }

    await client.query(
      `INSERT INTO memberships (user_id, household_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (user_id, household_id) DO UPDATE SET role = EXCLUDED.role`,
      [userId, householdId],
    );
    await client.query("COMMIT");
    console.log(`Local test user ${email} is ready.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
