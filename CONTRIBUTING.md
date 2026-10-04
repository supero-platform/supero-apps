# Contributing

Thanks for being here. Issues and PRs are welcome.

## Good first contributions

- **Fix an app** — a bug, a rough edge, a better screen
- **Add a vertical** — build something we don't have and open a PR
- **Improve docs** — if something confused you, it confused someone else

## Adding an app

1. Build it (`./run.sh`, or generate it and export the source)
2. Drop it in `apps/<industry>/<name>/` — reuse an existing industry folder if one fits
3. It must include: `README.md`, `schemas.py`, `setup.py`, `config.py`, `.env.example`, `run.sh`, `tests/`
4. **No secrets.** No `.env`, no API keys, no real credentials. `.env.example` only, values blank.
5. `./tests/run_tests.sh` should pass against a fresh domain
6. Open the PR — tell us what it does and link a live URL if you have one

## House rules

- **Never commit `.env`** or anything with a real key in it. This is the one hard rule.
- **Don't commit generated `ui/` files** — only `ui/app.js` is source. The rest is
  restored from the SDK on `run.sh` and is gitignored.
- **Use placeholders in docs** — `your-domain`, `you@example.com`. Never a real domain.
- **Claims must be true.** If a README says a thing works, it works. We'd rather ship a
  short honest README than a long aspirational one.
- **Messages go only to a verified identity.** The demo sign-in details are published, so
  any email address or phone number stored on a record is something a stranger could have
  typed. Send only to the signed-in user (`user.email` in an event binding) or to the
  account that owns the record (`owner_username`). Never map a recipient from a free-text
  field, and never send SMS from an event binding: there is no verified phone number.
  Commit `340bee5` closed this across the repo; a change that reopens it will not be merged.

## Reporting bugs

Include the app, what you ran, what happened, what you expected. If it's the platform
rather than the app, say so — we'll route it.

Security issues: **security@supero.dev**, not a public issue. See [SECURITY.md](SECURITY.md).

## Code of conduct

Be decent. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
