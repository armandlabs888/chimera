# Messages declutter — decision ledger

**Brief:** Refactor `/messages` and `/messages/[threadId]` to match Browse Jobs panel language and remove job/offer chrome from the conversation surface. Direct build (no visual alternatives).

**Research:** Refero MCP (no subscription) and Mobbin MCP (paid plan required) unavailable. Primary lock is current Browse implementation (PR #43 / `428865a`) plus user screenshots of clutter to eliminate.

## Reference lock

| Item | Commitment |
|------|------------|
| Primary visual | Browse Jobs panels: white cards on `#F4F8FD`, navy `#071330`, blue `#1D5CE5`, cool borders, subtle shadow, 8px wrappers / 6px tags |
| Layout | Two visually separate desktop panels with real gutter — not a joined wrapper with an internal divider |
| Clutter to remove | Persistent job summary / category / title / date / availability / status bars; confirmed-price / ETA strips; duplicate Completed / Open to offers |
| Keep | Thread selection, deep links, send, history, empty/missing/loading states, View request as discreet navigation |
| Reject | Third sidebar, reinvented online/typing/delivery claims, reinstating inline task/offer header |

## Decisions

| Decision | Source | Why |
|----------|--------|-----|
| Separate inbox + conversation cards with `gap-5` | Browse 3-col grid pattern | Matches approved marketplace chrome |
| Person-focused conversation header only | User override of older task/offer header preference | Declutter; request detail owns job/offer actions |
| Inbox rows: avatar / name / preview / time | User brief | Remove repeated job/status metadata |
| Subtle title disambiguation only when same person has multiple threads | User brief | Preserve identity without job banners |
| Unread badge from `new_message` notifications | Messaging norms + seed data | Modest heading + unread, not job filters |
| Remove Open/Booked inbox filters | Job-status framing | Status belongs on request page |
| `lg+` two-pane; `<lg` list-to-chat with back | User brief | Avoid squeezed tablet columns |
| Offer accept/send/complete stay on request detail | User brief | Workflows remain accessible without in-message panels |
