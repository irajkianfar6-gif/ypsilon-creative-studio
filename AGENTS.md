<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Persian RTL, mobile-first: every page renders inside `PhoneShell` (root) using `src/components/eco/screen.tsx` primitives — keeps all screens visually consistent with the design.
- Tariffs/contract terms come only from the versioned `rate_table`, never hard-coded — Regulation-as-Configuration (C-03).
- Sizing/finance formulas live in `src/lib/solar.ts` with tests in `src/test/solar.test.ts` — one source of truth for numbers shown across screens.
- User data (bills, plants, settlements) is read/written from the browser client under owner-only RLS; journey order is derived by `nextStep()` in `src/lib/flow.ts`.
- AI calls go through `@lovable.dev/ai-gateway` inside authenticated `createServerFn` handlers (e.g. `src/lib/bill-ocr.functions.ts`), SDK imported inside the handler — keeps prompts and keys server-side; AI output is never saved without user confirmation.
