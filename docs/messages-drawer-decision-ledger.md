# Messages drawer — decision ledger

**Brief:** Replace the full-page-only messages workspace with the approved right-side drawer (`beam-messages-drawer/index.html`). Live threads only. No sample people and no “Sample conversations” footer.

## URL strategy

| Surface | Behavior |
|---------|----------|
| Any signed-in app route | `?messages=1` opens the list drawer on **that** route. `?thread={id}` opens the conversation layer. Other query params (browse filters, `tab`, etc.) are preserved. |
| `?thread={id}` without `messages=1` | Still opens the drawer on that thread. Closing the conversation sets `messages=1` and drops `thread`. Closing the list drops both. |
| `/messages` | Server redirect to `/browse?messages=1`. Chosen over rendering a second host on a blank messages page so notification and bottom-nav links keep working and the page underneath is a real screen. |
| `/messages/:threadId` | Server redirect to `/browse?messages=1&thread={id}`. Notification hrefs such as `/messages/th-1` therefore open the right thread. |
| Live guests | Unchanged at the edge: proxy still sends `/messages` and `/messages/:id` to `/auth?next=…` **before** the page redirect. After sign-in, the next hop opens the drawer. A guest who lands on `?messages=1` is sent to `/auth` as well. Header clicks go straight to auth and do not open the drawer. |
| In-app “message this person” | Request detail, the browse job drawer, the You notifications list, the home action row, the headers, and the bottom dock open the drawer on the **current** route (home uses `/home?messages=1`). Stored notification hrefs stay `/messages/:id` so old links keep working via the redirect. |
| Browse `?job=` | Opening messages deletes `job` in the same history update so the job drawer and the messages drawer do not stack two focus traps. |

History: opening the list or a thread **pushes**. Closing a layer **replaces**, so Back from a thread returns to the list and Back from the list leaves the drawer.

`/messages` does **not** auto-select the latest thread. The list opens alone; a thread opens only from a click or a `thread` param. That matches the mock (list first, chat on selection) and replaces the old desktop “land in the latest conversation” behavior.

## Unread

- A thread is unread when the signed-in user has a `new_message` notification with no `readAt` whose href names that thread (`/messages/{id}` or `?thread={id}`). If the href does not name a thread, a matching `requestId` (or an href that contains the request id) still counts.
- Demo mode keeps the existing header rule: every unread `new_message` counts, including ones addressed to the other participant. Live mode counts only the current user’s notifications.
- The header badge (desktop label and mobile icon) uses that **notification** count. It is omitted at 0. There is no bell.
- The drawer pill and the Unread tab use the count of **threads** that have at least one matching unread notification.
- Opening a thread calls `markNotificationsRead` with every matching unread id (one demo state update, one live refresh after `markLiveNotificationRead` for each id). `markNotificationRead` remains for single clicks such as the You list.

## Layout

| Viewport | Panel |
|----------|--------|
| ≥960px | One shell, inset 12px, radius 14px, conversation 500px on the left of a 380px list, 1px divider, one shadow. |
| 640–959px | One 500px sheet. Chat replaces the list; back returns to the list. |
| <640px | Full-screen sheet. Same back behavior. Mobile header shows a messages icon (no text label) with the unread badge. |

Escape closes the conversation first, then the list. Scrim click closes both. Focus is trapped with `useFocusTrap`, body scroll locks, and focus returns to the visible Messages trigger. `prefers-reduced-motion` disables the slide.

## Deviations from the mock

| Item | Choice |
|------|--------|
| “Sample conversations for design review” footer | Omitted. Live data only. |
| Mock people, avatars, and scripted bubbles | Not shipped. Rows and bubbles come from Beam threads. |
| Extra empty-state line (“You can also message a helper…”) | Omitted. Empty, missing, and empty-thread copy stays the product copy from MessagesInbox / MessagesThread. |
| “Select a conversation” right pane | Not shown. The chat layer exists only when a thread is selected. |
| Desktop auto-open of the latest thread | Removed. `/messages` is list-only. |
| Bubble timestamp | Clock time (`3:42 PM`) under a sender group, with Today / Yesterday / date separators. The old relative time and the simulated “· reply” marker are not on the bubble. |
| Job strip status | `Open`, `Accepted`, `Completed`, `Cancelled` from the request. Green dot for open and accepted. Budget uses `formatBudget` (`$30 budget`, or “Open to offers” when the request is open-budget). |
| Header neighborhood | The other person’s location label (neighborhood), not the job’s area. The job title, category, budget, and status live on the linked-job strip. |
| Attachments, read receipts, typing | Not built. |
| Outer radius 14px | Matches the mock. Older “≤10px card” checks do not treat the drawer shell as one of those cards. Controls inside stay ≤12px. |
| Landing and `/onboarding` | App chrome is hidden there, so the drawer host is not mounted. |

## Shared logic

Send still goes through `sendMessage`. The conversation component is `MessagesChatPanel` (re-exported as `MessagesThread`). The old full-page `MessagesInbox` is no longer routed; `/messages` redirects as above.
