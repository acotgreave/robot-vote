# robot.howtospeakdata.com

"Which robot is winning the battle in your head?" This is the voting page for Andy Cotgreave's keynote *Why Human Insight Is More Important Than Ever in the Age of AI*.

```
Phone ──tap──▶ GitHub Pages (this repo) ──POST /vote──▶ Cloudflare Worker ──▶ D1 database
                                                                                 │
data/votes.csv ◀── GitHub Action, every 30 min ── GET /votes.csv ◀───────────────┘
```

- **The page** is plain HTML/CSS/JS on GitHub Pages. There is no build step.
- **The vote counter** is a free Cloudflare Worker with a D1 database. It copes with a whole room voting at the same moment.
- **The CSV**: a GitHub Action copies the Worker's `/votes.csv` into `data/votes.csv` every 30 minutes. No tokens or secrets are needed.
- **Seed data**: 75 Red and 32 Blue votes dated 29 Sep 2026, with `source = seed`.
- **One vote per phone**: the browser remembers its vote (cookie + localStorage), and the Worker ignores a second vote from the same browser ID.
- **Privacy**: IP addresses are never stored. Country, region and city come from Cloudflare's own lookup.

CSV columns: `vote_id, timestamp_utc, robot, robot_label, country, region, city, event, source`
(`source` is `seed`, `web` or `test`. Gaps in `vote_id` are repeat votes the Worker ignored.)

## How voting feels to the audience

1. Tap a robot. The result bar, the KAPOW and the Subscribe/Follow panel appear instantly. The page doesn't wait for the server.
2. The vote is sent in the background and retried until it lands. If the venue wifi is dead, it's kept on the phone and sent when signal returns (including on a later visit).
3. Once they scroll past the Subscribe/Follow panel, a slim "Follow Andy" bar stays pinned to the bottom of the screen.

## URL switches

| URL | What it does |
|---|---|
| `robot.howtospeakdata.com/?e=dis26` | Tags votes with an event name (the `event` column). Point each event's QR short link at a URL like this. |
| `robot.howtospeakdata.com/?test` | **Test mode** on this browser: a striped banner with **Reset my vote**. Test votes are stored with `source = test` and are never counted in the public tally. |
| `robot.howtospeakdata.com/?test=off` | Leave test mode. |

## Day-to-day

- **Live tally**: `https://<worker>/results`
- **Live CSV**: `https://<worker>/votes.csv`
- **Update the GitHub CSV now**: GitHub → Actions → *Sync votes* → *Run workflow*
- **Delete test votes**: Cloudflare dashboard → D1 → `robot-votes` → Console: `DELETE FROM votes WHERE source = 'test';`

## Deploying the Worker

From the `worker/` folder:

```
npx wrangler login
npx wrangler d1 create robot-votes     # paste the database_id it prints into wrangler.toml
npx wrangler deploy                     # prints the https://robot-vote.<you>.workers.dev address
```

Then put that address in `config.js` and push. The Worker creates its table and seed votes on first use.

## Testing locally

Serve the site on `http://localhost:5173` (e.g. `npx http-server . -p 5173 -c-1`) and open `http://localhost:5173/?test`.
Use **Reset my vote** in the striped banner to vote again. Local test votes go to the live counter as `source = test`, so they never affect the tally.

To test the Worker itself without touching live data: `npx wrangler dev` in `worker/` (local database), then point `config.js` at `http://localhost:8787`.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The page |
| `config.js` | The Worker address |
| `assets/` | Robot cut-outs, Andy photo, social share image, favicon |
| `data/votes.csv` | Vote log (kept up to date by the GitHub Action) |
| `worker/` | Cloudflare Worker code and config |
| `.github/workflows/sync-votes.yml` | Copies votes into `data/votes.csv` |
| `CNAME` | Tells GitHub Pages to serve robot.howtospeakdata.com |
