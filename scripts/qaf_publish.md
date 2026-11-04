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
