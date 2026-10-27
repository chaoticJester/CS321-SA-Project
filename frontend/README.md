# SA Project — Final Prototype

React and TypeScript implementation of the [Figma Final Prototype](https://www.figma.com/design/zD2Rs5mCWypWJG0htNpgn6/SA-Project-13?node-id=272-495).

## Run

Start the MySQL-backed API using the setup in [backend README](../backend/README.md). Then:

```sh
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:3000`. Set `VITE_API_URL` to use another API address. Sign in with an employee ID and passcode from the database. The employee's approval level determines the requester or approver view.

## Screens

- Authentication: employee ID, email, incorrect password, submitting, and forgot password.
- Requester: home with **pending PRs only**, all four create steps, draft and submitted PDF previews, submission confirmation, My Requests, history, request detail, and notifications.
- Approver: dashboard, pending/all requests, approval history, review, electronic signature and success state, read-only request detail, and notifications.

Navigation, status/month/search filters, pagination, attachment upload/download, submission tracking, and approval decisions are connected to the existing application flows. The implementation removes the earlier demo disclosure, invented signup form, account menus, extra attachment fields, and cancel confirmation.

My Requests loads all pages of the authenticated `GET /api/pr` list directly. Full items, approval status, requester information, and attachments are fetched when a PR is opened, so an unavailable detail or attachment does not hide the list. Budget Code displays `—` where the backend has no stored code.

All, In process, and History share the same requester list and counts. History loads approval timestamps and comments separately without downloading attachments. Switching tabs retains consistent positions, reserves scrollbar space, and uses fixed table columns; list pages fade in without moving their headings, tabs, or columns.

Requester home uses `GET /api/pr?limit=100&status=pending` and preserves the status filter across backend pages. Cards do not load detail or attachment endpoints. Opening a PDF preview fetches that PR's full data; a preview failure leaves the pending cards visible.

## Data boundaries

Employee-ID login, PR submission, attachments, approval status, pending approvals, and approval history use the backend. Approval history is exposed through `GET /api/employees/:id/approval-history`, restricted to the authenticated employee.

Email login, password-reset email, and account registration have no corresponding backend service. Their Figma UI is retained without inventing destination pages. Notifications are derived from available PR and approval records; read markers are stored per employee in localStorage. The bell shows only unread items and hides its badge at zero. Reading an item or marking all read updates the bell immediately, including in other tabs. A new PR status creates a new unread notification. Read markers persist on this browser; they are not synchronized across devices. Dashboard figures reflect records available to the signed-in approver.

Drafts and attachment bytes are stored in IndexedDB. Dropdown choices and the 130,000 THB budget balance remain local form fixtures because there is no budget catalog endpoint. Fields unsupported by the backend schema, such as budget code and separate item brand/model, are retained while editing but are not stored as separate database fields.

PDF preview panels reproduce the blank document canvas in Figma. Download/print opens the actual requisition through the browser print dialog, which supports Save as PDF.

## Verify

```sh
npm run build
npm run lint
```

`tests/design-flow.cjs` exercises 26 browser states with deterministic mocked API responses, including requester pending-only cards, submission tracking, invalid/valid signature passcodes, notification read state, and mobile layout. It does not change the database.

With Playwright available and the Vite server running:

```sh
node tests/design-flow.cjs
```

Optional environment variables: `PLAYWRIGHT_MODULE` for a Playwright module path, `CHROME_PATH` for an installed Chrome executable, and `VERIFY_OUTPUT` for screenshots. These browser checks validate frontend flows; they do not verify a live MySQL connection.

`node tests/my-requests.cjs` additionally checks authenticated list requests, multiple backend pages, loading details on demand, and API failures. Set `LIVE_API=1` to compare My Requests with the live backend and database without modifying PRs. This uses seeded requester `E0020` and passcode `123456` by default; override them with `TEST_EMPLOYEE_ID` and `TEST_PASSCODE` for another test account.

`node tests/requester-home.cjs` checks pending-only backend cards, pagination, loading previews on demand, and isolation from missing attachment files. `LIVE_API=1` verifies those cards against the live database using the same test-account settings.

`node tests/notifications.cjs` checks both roles' unread badges, reading one/all items, reload persistence, new statuses, cross-tab updates, legacy read markers, malformed storage, mobile layout, and reduced motion. The design-flow checks also verify that all 26 captured states have animation coverage. Page, card, row, dialog, and badge animations respect `prefers-reduced-motion` and are disabled for printing.

`node tests/request-detail.cjs` checks the request summary's Thai date, quantity-only display, line totals, grand total, comma-formatted prices, decimal rounding, and mobile layout. Amounts use the same calculation helpers as the PR form.

`node tests/date-picker.cjs` checks the styled Require Date calendar, direct date entry, month and keyboard navigation, leap years, Today/Clear actions, Escape and outside-click dismissal, required validation, mobile placement, and reduced motion. The selected value remains an ISO date for drafts and API submission.
