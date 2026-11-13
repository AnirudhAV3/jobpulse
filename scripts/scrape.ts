import { pool } from "../src/db";
import { executeTickAllUsers } from "../src/lib/engine";

async function main() {
  const result = await executeTickAllUsers("github_actions");
  console.log(JSON.stringify({ ok: result.failedUsers === 0, ...result }, null, 2));
  if (result.failedUsers > 0) {
    throw new Error(`${result.failedUsers} user scraper run(s) failed`);
  }
  if (result.usersProcessed === 0) {
    console.log("No enabled users were due for a scraper run.");
  }
}

main()
  .catch((error: unknown) => {
    console.error("[jobpulse-scraper]", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
