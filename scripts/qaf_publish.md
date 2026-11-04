# QAF shared publication entry

This entry installs maintenance tooling only. It does not start a schedule or
authorize new articles. Git authentication is used as configured; credentials are
never read or printed. No Pages-settings/workflow-list endpoint is used.

News uses `qaf_news_publish.py`, viewpoints use `qaf_viewpoints_publish.py`.
Both call the same `qaf_publish.py` and the same fixed Windows machine-local state
directory: `~/Documents/Codex/2026-10-16/task/qaf-publisher-state`.
The lock is NOT distributed. Every cooperating writer on this computer must use
these entries; unrelated writers and other computers cannot be controlled by it.

## Plan and isolated preparation

Prepare a JSON plan with `operation` (unique, 8–100 letters/digits/hyphens), `kind`
(`news`, `viewpoints` or maintenance), `base` (reviewed main SHA), `message`, and
`files`. Each file has repository `path`, local `source`, `beforeSha256` (SHA256
of canonical Git base-blob bytes, or empty bytes for a new file), and `sha256` of source bytes.
Windows checkout CRLF is not used as the base hash; comparisons and backups use
the exact base commit's blobs, and public readback uses committed artifact bytes.
Only the target content page and news assets are permitted for article writers.
The common index cache/version is updated by the entry. Maintenance is restricted
to `scripts/qaf*.py`, `.cjs`, `.md`. All paths are checked before staging.

`python scripts/qaf_news_publish.py prepare plan.json --repo CONTROL_CHECKOUT`

Preparation acquires a persistent exclusive lease, fetches the existing main,
requires exact base and file hashes, and uses a detached isolated Git worktree.
It records pre-change file bytes and hashes, validates history, IDs, source URLs,
products, new Taiwan dates, card lengths and the three-news-per-day limit. New
viewpoints preserve all existing article bytes. This entry deliberately does not
provide delete or full-site rollback commands. Prepared commits are local only.

## Submission and races

Review the receipt and staged diff, then invoke `push OPERATION --repo ...` only
when that exact publication is authorized. It fetches main again, stops if main
changed, and uses only an ordinary `COMMIT:refs/heads/main` push. No force options
exist. A race after the fetch is rejected by Git's non-fast-forward protection.
Any error preserves the lease and records an uncertain/rejected state. Check the
remote before deciding the result. Never repeat push blindly.

For a known pre-push main change, read the recorded latest main, `abort` the
unsubmitted operation, merge the intended edits against the new main, recheck
dedupe/daily quota, and prepare a NEW operation with new base/file hashes. Do not
copy the stale whole page onto latest main. Conflicts require human/content
resolution. No automatic retry or automatic publication is performed.

## Deployment and readback

`verify OPERATION --repo ...` reads public commit and Actions run data, selects
only the exact SHA's automatic Pages run, and requires success. It compares every
changed public file and the sanitized `qaf-publication.json` marker byte-for-byte,
then checks main again. Pending runs mean later VERIFY, never another push.
No concurrency setting is assumed or changed. Keep the lease through completion.

After actual browser acceptance (correct title/content/sources, image decoding
and complete hardware, affected interactions and viewport smoke), supply JSON
with matching `operation`, `commit`, `passed: true` and detailed evidence to
`accept OPERATION --browser-evidence evidence.json --repo ...`. Only then is the
lease released. The JSON is an auditable writer receipt, not a security boundary
and not a substitute for performing the browser checks.

`status` is read-only. `abort` can release only prepared or needs-rebase states;
it cannot release submitted/uncertain work. Crash/stale lease recovery is manual
after verifying owner and remote outcome; do not delete unknown locks.

This tool does not prevent a separately privileged user from bypassing it or
forcing a branch. GitHub roles, branch protection, credentials and schedules are
not changed. Historical one-off scripts are not safe recurring writers.

## Explicit viewpoint lifecycle (single stable ID)

Viewpoint plans may supply `viewpointLifecycle` with action modify/remove/restore,
stable ID, pageSha256, historySha256, articleSha256, and (modify only)
replacementBase64. The same plan must carry the exact target page and
`data/viewpoint-history.json`. The publisher recomputes both from canonical
base blobs and refuses any candidate that changes unrelated content.

Original and revised article bytes are retained in content-addressed versions
with a chained event log. Removal is recoverable public unlisting, not erasure:
Git history and the JSON archive retain the formerly public text. No purge
command is provided. Never place private material in this public archive.

Modification retains stable ID and original publication/prepared dates. Restore
requires the outstanding removed version, no ID/title collision and an unchanged
neighbor anchor. Stale page/history/target hashes stop the plan. Legacy articles
without stable IDs require a separately reviewed nonvisible ID migration; the
entry does not infer identity from title or automatically migrate old articles.

The existing lease, newest-main check, backup, isolated worktree, normal push,
exact-commit deployment and formal/browser acceptance remain mandatory.
Lifecycle installation is not authorization to modify or unlist arbitrary articles.
No new credentials, host settings, permissions or schedule are involved.

## Nonvisible legacy stable-ID migration

An explicit `viewpointIdMigration` plan supplies action migrate/revert,
pageSha256, manifestSha256 and expectedCount (migrate). Both the target page
and data/viewpoint-id-map.json are required. IDs derive from original article
SHA256; collisions stop. Only the new data-viewpoint-id attribute may differ.
The mapping stores before/after hashes and is committed with the page.
Exact reversal is supported only before any later page edits; otherwise stop
and review a new merge, never overwrite later work. Existing IDs remain unchanged.
Migration is not article publication and cannot combine with lifecycle actions.

## Explicit recoverable news lifecycle

A news plan may provide `newsLifecycle` with modify/remove/restore, stable id,
pageSha256, historySha256, itemSha256 and replacement object (modify only).
It must supply only friend-news-digest.html and data/news-history.json. The
entry recomputes both, rejects unrelated changes, then updates shared cache.
News IDs and digest dates are immutable. Existing image files are retained;
asset updates use a separately reviewed ordinary news plan.

The public history archive retains full item versions, chained operation events,
neighbor IDs and an immutable publication-date catalog. Restore requires an
outstanding removal, matching version and a surviving neighbor; collisions stop.
Ordinary additions also check archived IDs/products/source URLs and daily counts
including recoverably removed articles. Remove/restore does not reset daily quota.

This is recoverable unlisting, not privacy erasure. No purge, credentials,
permission changes, new service, scheduler or alternate deployment route exists.
Actual article changes still require specific task authorization and review.

## Viewpoint dates, dedupe, daily goal and reviewed backfill

Every ordinary viewpoint append and explicit lifecycle plan now generates
data/viewpoint-publication-ledger.json internally from canonical base blobs and
existing version history. Caller-supplied empty ledgers are not allowed. The
ledger is backed up and committed with the page/history in the same worktree.
It is first materialized by the next article operation; maintenance installation
does not edit existing content or guess unknown original publication dates.

New articles require stable IDs and an ISO publication date equal to Taiwan
today, derived from an aware system clock. Prepared dates can be older but not
in the future. Existing approved historical batches and unknown dates remain.
ID, normalized title and identical body fingerprints are checked against active
and archived records. The same book/PDF page can support distinct viewpoints;
semantic overlap still needs editorial review.

Three new articles per Taiwan day is the ordinary daily goal, not an absolute
backlog ceiling. A reviewed authorized backlog batch may supply viewpointBackfill
with ids listing EXACTLY all new article IDs and a short public reason. Such a
batch can exceed three; it cannot bypass date/dedupe or change prior dates. This
field scopes a reviewed publication plan, not a grant of user authorization.
Do not place private conversation or approval evidence in the public plan/ledger.

Removal never releases the original daily count. Modify/restore record no new
publication; restored content must match an outstanding archived removal.
Ledger/ID mapping changes require a separately reviewed merge once a ledger
exists; do not revert IDs used by publication history. No schedule or permissions
are changed. Existing lease, latest-main SHA, ordinary push and exact formal
acceptance remain required.
