/**
 * Robot Vote: Cloudflare Worker
 * ------------------------------------------------------------
 * Receives votes from robot.howtospeakdata.com and stores them in a
 * Cloudflare D1 database. D1 copes with a whole room voting in the
 * same few seconds, which a file on GitHub can't.
 *
 * The GitHub copy of the data (data/votes.csv) is pulled from
 * /votes.csv by a GitHub Action (.github/workflows/sync-votes.yml),
 * so this Worker needs no GitHub token.
 *
 * Endpoints
 *   POST /vote       body: {"robot":"red"|"blue","voter":"<id>","event":"<tag>","test":bool}
 *   GET  /results    -> {"red":n,"blue":n,"total":n,"countries":n}  (test votes excluded)
 *   GET  /votes.csv  -> every vote, including test votes (source = test)
 *
 * Bindings / settings (see wrangler.toml):
 *   DB               D1 database binding (required)
 *   ALLOWED_ORIGINS  comma-separated list of sites allowed to vote
 *
 * Privacy: IP addresses are never stored. Location comes from
 * Cloudflare's own lookup (country / region / city).
 */

const SEED = { blue: 32, red: 75 };
const SEED_DATE = "2026-09-29";
const ROBOTS = ["red", "blue"];
const ROBOT_LABEL = { red: "Red Rocker (AI is too dangerous)", blue: "Blue Bomber (This AI tech is amazing)" };

let schemaReady = false;

async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS votes (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         ts TEXT NOT NULL,
         robot TEXT NOT NULL,
         country TEXT, region TEXT, city TEXT,
         event TEXT,
         source TEXT NOT NULL DEFAULT 'web',
         voter TEXT UNIQUE
       )`
    ),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`),
  ]);
  const seeded = await env.DB.prepare(`SELECT v FROM meta WHERE k = 'seeded'`).first();
  if (!seeded) {
    // Seed with results from earlier polls, timestamped today.
    // The meta insert is first in the batch (a single transaction), so if two
    // requests race, the second fails on the primary key and nothing is duplicated.
    const stmts = [env.DB.prepare(`INSERT INTO meta (k, v) VALUES ('seeded', '1')`)];
    let i = 0;
    for (const robot of ["blue", "red"]) {
      for (let k = 0; k < SEED[robot]; k++, i++) {
        const t = new Date(Date.parse(`${SEED_DATE}T09:00:00Z`) + i * 1000).toISOString();
        stmts.push(
          env.DB.prepare(
            `INSERT INTO votes (ts, robot, country, region, city, event, source) VALUES (?, ?, '', '', '', '', 'seed')`
          ).bind(t, robot)
        );
      }
    }
    try {
      await env.DB.batch(stmts);
    } catch (_) {
      /* another request seeded first */
    }
  }
  schemaReady = true;
}

function corsHeaders(req, env) {
  const allowed = (env.ALLOWED_ORIGINS || "https://robot.howtospeakdata.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.get("Origin") || "";
  const ok = allowed.includes("*") || allowed.includes(origin);
  return {
    headers: {
      "Access-Control-Allow-Origin": ok ? origin || "*" : allowed[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
    ok,
  };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors.headers },
  });
}

async function getResults(env) {
  const rows = await env.DB.prepare(
    `SELECT robot, COUNT(*) AS n FROM votes WHERE source <> 'test' GROUP BY robot`
  ).all();
  const out = { red: 0, blue: 0 };
  for (const r of rows.results) if (r.robot in out) out[r.robot] = r.n;
  const c = await env.DB.prepare(
    `SELECT COUNT(DISTINCT country) AS n FROM votes WHERE source <> 'test' AND country <> ''`
  ).first();
  return { ...out, total: out.red + out.blue, countries: c.n };
}

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function buildCsv(env) {
  const rows = await env.DB.prepare(
    `SELECT id, ts, robot, country, region, city, event, source FROM votes ORDER BY id`
  ).all();
  const lines = ["vote_id,timestamp_utc,robot,robot_label,country,region,city,event,source"];
  for (const r of rows.results) {
    lines.push(
      [r.id, r.ts, r.robot, ROBOT_LABEL[r.robot], r.country, r.region, r.city, r.event, r.source]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n") + "\n";
}

// Event tags come from the QR link (?e=dis26); keep them short and tidy.
function cleanTag(v) {
  return typeof v === "string" ? v.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) : "";
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors.headers });

    try {
      await ensureSchema(env);

      if (url.pathname === "/vote" && req.method === "POST") {
        if (!cors.ok) return json({ error: "origin not allowed" }, 403, cors);
        let body = {};
        try {
          body = await req.json();
        } catch (_) {}
        const robot = String(body.robot || "").toLowerCase();
        if (!ROBOTS.includes(robot)) return json({ error: "robot must be red or blue" }, 400, cors);
        const voter = typeof body.voter === "string" && body.voter ? body.voter.slice(0, 64) : null;
        if (!voter) return json({ error: "missing voter id" }, 400, cors);

        const cf = req.cf || {};
        // INSERT OR IGNORE + the UNIQUE voter column make retries safe:
        // a phone that resends the same vote is only ever counted once.
        const res = await env.DB.prepare(
          `INSERT OR IGNORE INTO votes (ts, robot, country, region, city, event, source, voter)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            new Date().toISOString(),
            robot,
            cf.country || "",
            cf.region || "",
            cf.city || "",
            cleanTag(body.event),
            body.test === true ? "test" : "web",
            voter
          )
          .run();

        const results = await getResults(env);
        return json({ ok: true, counted: res.meta.changes === 1, results }, 200, cors);
      }

      if (url.pathname === "/results" && req.method === "GET") {
        return json(await getResults(env), 200, cors);
      }

      if (url.pathname === "/votes.csv" && req.method === "GET") {
        return new Response(await buildCsv(env), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'inline; filename="votes.csv"',
            "Cache-Control": "no-store",
            ...cors.headers,
          },
        });
      }

      if (url.pathname === "/") {
        return json({ service: "robot-vote", endpoints: ["/vote", "/results", "/votes.csv"] }, 200, cors);
      }

      return json({ error: "not found" }, 404, cors);
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, 500, cors);
    }
  },
};
