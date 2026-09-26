# SA Project — Final Prototype

React, TypeScript, and Vite implementation of the [Final Prototype page in Figma](https://www.figma.com/design/zD2Rs5mCWypWJG0htNpgn6/SA-Project-13?node-id=272-495).

## Run

Use Node.js 24 or newer (the unit tests use Node's built-in TypeScript support).

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Sign in using either:

- Employee ID: `EMP-104882`
- Company email: `somchai.k@company.co.th`
- Password for either method: `Demo@123`

The **Demo access** disclosure on the login screen also shows these credentials. Any other credentials display the incorrect-password state. A successful sign-in displays the loading state before opening the PR form.

## Implemented screens

| Figma frame | Node | Application behavior |
| --- | --- | --- |
| Login - 1 | 277:2111 | Employee-ID sign-in |
| Login - 2 | 277:2138 | Company-email sign-in |
| Login - Wrong password | 277:2221 | Invalid-credential feedback |
| Login - Submitting | 277:2246 | Loading state after successful demo sign-in |
| Login - Forget password | 277:2267 | Reset request form with explicit demo result |
| Landing page - Requester | 419:1665 | Requester home, examples, search, and create action |
| Create PR-1 | 384:6213 | Basic information and required-field validation |
| Create PR-2 (Default) | 384:6385 | Empty item editor |
| Create PR-2 (Add Item) | 384:6554 | Live quantity × unit-price totals, add/edit/remove rows, amount words, remarks |
| Create PR-3 | 384:7471 | Drop or select JPG/PNG/PDF files, remove/download files, select purchaser |
| Create PR-4 | 384:6925 | Budget control, summary, document preview, submission |
| PR - Submit State | 418:1282 | Submission confirmation and next approver |
| My Requests | 423:1641 | Active/all request filters and locally submitted requests |
| PR History | 426:2575 | Request history table |
| View PR Detail | 442:3176 | Request, item-total, attachment, and approval detail |
| Landing page - Approver | 367:2835 | Approval queue and dashboard summary |

The sign-up button opens a small request-access form because the design contains that action but no destination frame. Cancel has a confirmation dialog. The PDF action opens a printable document; use the browser's **Save as PDF** option.

## Data and integration boundaries

This is a functional **local frontend prototype**, not a production procurement system. The frontend demo flow is not yet connected to the repository's backend services.

- Authentication uses fixed demo credentials; it does not establish a secure server session. Passwords are not persisted.
- Reset/sign-up requests do not send email or create an account.
- **Save Draft** stores the current form and actual attachment bytes in IndexedDB on the current browser/origin. Sign in again to restore it. Unsaved changes show the browser's leave-page warning.
- **Submit** validates the form, stores a completed record locally with a generated PR reference, and clears the saved draft in the same transaction. It does not contact an approver. The success dialog explicitly explains this.
- The budget is a demo balance of **130,000 THB**, matching the budget-control table. Both review panels use the same calculated balance; the contradictory static Figma examples (52 versus 57,000 THB) are replaced by the actual line-item total.
- Available dropdown choices and requester details are demo fixtures. Only THB is supported; no currency conversion is performed.
- Each attachment must be nonempty, JPG/PNG/PDF, and at most 5 MB. Browser storage quota may limit the total; failed writes retain the open form and show an error.
- Server authentication, authorization, employee/vendor/budget APIs, file security scanning, approval routing, and email require a backend before production use.

## Design assets and styling

Reusable React components live in `src/components`. Shared validation/calculation/persistence functions live in `src/model.ts`. Styling combines shared CSS with Tailwind utility classes and responsive layouts.

Figma-exported icons are saved in `public/figma` so the app does not depend on expiring asset URLs. Bai Jamjuree, Noto Sans Thai, and Sarabun fonts are bundled locally through Fontsource. PR layouts reproduce the upright Figma screenshots instead of copying the source nodes' rotated absolute positioning.

## Verify

```sh
npm run build
npm run lint
```
