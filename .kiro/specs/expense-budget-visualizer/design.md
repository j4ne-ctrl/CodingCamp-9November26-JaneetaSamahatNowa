# Design Document

## Overview

The Expense & Budget Visualizer is a client-side single-page application (SPA) built with plain HTML, CSS, and Vanilla JavaScript — no frameworks, no build tools, no server. All state lives in an in-memory JavaScript array that is kept in sync with `localStorage`. The UI is re-rendered synchronously on every state mutation.

The application runs entirely in the browser. The only external dependency is **Chart.js 4.4.1** loaded from a CDN. Fonts are loaded from Google Fonts. Everything else is authored in three files: `index.html`, `css/style.css`, and `js/script.js`.

---

## Architecture

### Overall Structure

```
index.html          — Single entry point; markup, CDN imports, inline anti-flash script
css/style.css       — All styling: custom properties, theming, layouts, animations
js/script.js        — All application logic: state, rendering, event handling
```

The JavaScript file is wrapped in `'use strict'` and uses a module-like pattern with no ES module syntax (no `import`/`export`) to remain compatible with direct `<script src>` loading. The entry point is a single `init()` function called on `DOMContentLoaded`.

### Initialization Flow

```
DOMContentLoaded
  └─ init()
       ├─ Cache DOM references into `dom` object
       ├─ loadTransactions() → restore in-memory array from localStorage
       ├─ loadSpendingLimit() → restore spending limit value
       ├─ Apply persisted theme (already done by inline script before body render)
       ├─ Attach event listeners
       └─ renderAll()
            ├─ renderBalance()   — Balance_Card + Stats_Bar
            ├─ renderList()      — Transaction_List
            └─ renderChart()     — Chart.js pie chart
```

### Anti-Flash Theme Script

An inline `<script>` in `<head>` runs before the `<body>` renders. It reads `localStorage.getItem('ebv_theme')` and applies `data-theme` to `<html>` immediately, preventing a visible flash of the wrong theme on page load.

### State Mutation Pattern

Every user action that changes state follows this pattern:

1. Validate input (if applicable)
2. Mutate the in-memory `transactions` array
3. Persist to `localStorage` via `saveTransactions()`
4. Call `renderAll()` to synchronously re-render all UI regions

---

## Components and Interfaces

The application has no component framework. Each logical UI region corresponds to a render function that writes directly to the DOM.

### Form (`handleSubmit`, `validateForm`)

- **Element**: `#expenseForm`
- **Inputs**: `#itemName` (text), `#amount` (number), `#category` (select)
- **Error targets**: `#nameError`, `#amountError`, `#categoryError`
- **Behavior**: `validateForm()` returns a boolean. On `true`, a new Transaction is built and pushed to the array. The form is then reset via `expenseForm.reset()` with `category.value = ''` to ensure the select returns to its placeholder.
- **Live error clearing**: `input` / `change` listeners on each field clear that field's error span immediately so the user gets instant feedback.

### Balance Card (`renderBalance`)

- **Element**: `#balanceCard`, `#totalBalance`, `#balanceWarning`, `#meterBlock`, `#meterFill`, `#meterText`
- **Behavior**: Sums all transaction amounts. If a spending limit is active:
  - Total ≥ limit → adds class `over-limit`, shows warning text with overage amount.
  - Total < limit → shows progress meter with `width` set as a percentage and descriptive text.
  - Limit is 0 / unset → hides meter, removes `over-limit`.

### Stats Bar (`renderBalance`)

- **Elements**: `#statCount`, `#statTop`, `#statAvg`
- **Behavior**: Rendered in the same `renderBalance()` call.
  - Count: `transactions.length`
  - Top category: sort `CATEGORIES` by descending cumulative total from `getCategoryTotals()`. Ties are broken by recency because `CATEGORIES` order is fixed and the last-added category for the tied value will appear later in the sort's stable order.
  - Average: total / count, or 0 when empty.

### Transaction List (`renderList`)

- **Element**: `#transactionList`, `#listEmpty`
- **Behavior**: Clears `innerHTML` and rebuilds from `getSortedTransactions()`. Each item is a `<div class="transaction-item">` built with `innerHTML`. The `animateNewItem` module-level variable holds the ID of the most-recently-added transaction; if matched, `animate-in` class is added for the slide-in animation. Items whose amount exceeds the spending limit receive class `over-limit`.
- **Deletion**: Handled via event delegation on `#transactionList`. A click bubbles up; `closest('.btn-delete')` finds the button. The item gets class `removing` for the slide-out animation, then the transaction is removed from the array and `renderAll()` is called (guarded against double-fire via `removed` flag and 300 ms timeout fallback).

### Chart (`renderChart`)

- **Element**: `#pieChart` (canvas), `#chartWrapper`, `#chartEmpty`
- **Library**: Chart.js 4.4.1 (UMD build via CDN)
- **Behavior**: Only categories with `totals[c] > 0` are included. If none, the canvas is hidden and the empty state is shown. If a chart instance already exists, `chart.data` is mutated and `chart.update()` is called — the instance is **never** destroyed and recreated on data updates.
- **Theme awareness**: `getChartOptions()` reads the `data-theme` attribute to pick the legend text color. The segment border color is read from the `--card-bg` CSS variable via `getComputedStyle`.

### Theme Toggle (`handleThemeToggle`)

- **Element**: `#themeToggle`
- **Behavior**: Reads current `data-theme` from `<html>`, flips it, writes back, persists to localStorage, and calls `renderChart()` to update chart colors.
- **Icon visibility**: CSS handles icon display — `.icon-moon` is visible in light mode, `.icon-sun` is visible in dark mode — using `[data-theme="dark"]` selectors, no JS involved.

### Sort Dropdown (`handleSortChange`)

- **Element**: `#sortBy`
- **Behavior**: Updates `currentSort` module-level variable and calls `renderList()`. Does **not** mutate the `transactions` array. `getSortedTransactions()` returns a shallow copy via `.slice()` before sorting.

### Spending Limit Input (`handleSpendingLimitChange`)

- **Element**: `#spendingLimit`
- **Behavior**: On every `input` event, `saveSpendingLimit()` persists the current value and `renderBalance()` + `renderList()` re-render to reflect the new limit.

---

## Data Models

### Transaction Object

```js
{
  id:       string,   // generateId() — Date.now().toString(36) + random suffix
  name:     string,   // trimmed user input, 1–50 chars
  amount:   number,   // positive float, parsed from input
  category: string,   // "Food" | "Transport" | "Fun"
  date:     number    // Unix timestamp ms, Date.now() at time of creation
}
```

### localStorage Keys

| Key | Type stored | Fallback |
|---|---|---|
| `ebv_transactions` | JSON string of `Transaction[]` | `[]` |
| `ebv_theme` | `"light"` or `"dark"` | `"dark"` |
| `ebv_spending_limit` | Numeric string | `0` |

### Category Color Map

```js
CATEGORY_COLORS = {
  Food:      '#f58f7c',
  Transport: '#f2c4ce',
  Fun:       '#d6d6d6'
}
```

### Module-Level State

```js
var transactions   = [];    // in-memory source of truth, synced to localStorage
var currentSort    = 'newest';
var chart          = null;  // Chart.js instance, null until first render
var animateNewItem = null;  // id of the most-recently-added transaction
var dom            = {};    // cached DOM references, populated in init()
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction submission appends to the list

*For any* non-empty item name, positive amount, and valid category, submitting the form shall increase the transaction array length by exactly 1, and the new element shall carry the submitted name, amount, and category.

**Validates: Requirements 1.2**

---

### Property 2: Whitespace-only names are rejected

*For any* string composed entirely of whitespace characters (including the empty string), the validator shall return `false`, the error message "Item name is required" shall be set on `#nameError`, and the transaction array shall remain unchanged.

**Validates: Requirements 1.3**

---

### Property 3: Non-positive amounts are rejected

*For any* amount value that is `NaN`, zero, or negative, the validator shall return `false`, the error message "Enter a valid amount greater than 0" shall be set on `#amountError`, and the transaction array shall remain unchanged.

**Validates: Requirements 1.4**

---

### Property 4: Input event clears the corresponding field's error

*For any* form field that currently displays a validation error, firing an `input` (or `change` for the select) event on that field shall result in an empty error message for that field.

**Validates: Requirements 1.6**

---

### Property 5: Transaction list renders one item per transaction

*For any* non-empty array of transactions passed to `renderList`, the number of `.transaction-item` elements rendered in `#transactionList` shall equal the array length, and each element shall contain the transaction's name, category badge, formatted date, formatted amount, and a delete button.

**Validates: Requirements 2.1**

---

### Property 6: Deleting a transaction removes exactly that entry

*For any* transaction in the array, invoking the delete action for that transaction's ID shall reduce the array length by 1 and the deleted transaction's ID shall not appear in the remaining array or in `localStorage`.

**Validates: Requirements 2.4**

---

### Property 7: Balance equals the sum of all transaction amounts

*For any* array of transactions with known amounts, `renderBalance` shall display a value equal to the arithmetic sum of all amounts, formatted as Indonesian Rupiah with the prefix "Rp" and a period as the thousands separator.

**Validates: Requirements 3.1**

---

### Property 8: Stats Bar reflects array state correctly

*For any* non-empty transaction array, `statCount` equals the array length, `statAvg` equals total/length (formatted as Rupiah), and `statTop` equals the category whose cumulative sum is highest.

**Validates: Requirements 3.2**

---

### Property 9: Sort does not mutate the source array

*For any* transaction array and any sort key (`newest`, `oldest`, `amountDesc`, `amountAsc`, `category`), calling `getSortedTransactions()` shall return a new array in the specified order while leaving the original `transactions` array unmodified.

**Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**

---

### Property 10: Chart segments match categories with positive spend

*For any* transaction array, `getCategoryTotals()` filtered to entries greater than 0 shall exactly match the labels passed to the Chart.js dataset — no more, no fewer.

**Validates: Requirements 4.1**

---

### Property 11: Tooltip callback formats amounts as Rupiah

*For any* category name and positive integer amount, the Chart.js tooltip label callback shall return a string of the form `"<Category>: Rp <formatted-amount>"` using Indonesian locale formatting.

**Validates: Requirements 4.6**

---

### Property 12: Transaction persistence round-trip

*For any* sequence of add and delete operations on the transaction array, `JSON.parse(localStorage.getItem('ebv_transactions'))` shall deeply equal the current in-memory `transactions` array.

**Validates: Requirements 5.1, 5.4**

---

### Property 13: Spending limit persistence round-trip

*For any* positive integer limit value passed to `saveSpendingLimit`, calling `loadSpendingLimit()` immediately after shall return the same value.

**Validates: Requirements 5.3, 5.6**

---

### Property 14: Over-limit balance card when total exceeds limit

*For any* transaction array whose sum is greater than or equal to a positive spending limit, `#balanceCard` shall carry the class `over-limit` and `#balanceWarning` shall be visible and state the overage amount.

**Validates: Requirements 8.2**

---

### Property 15: Progress meter percentage is correct

*For any* transaction array and positive spending limit where the total is strictly less than the limit, the meter fill's `width` style shall equal `Math.round((total / limit) * 100)` percent, capped at 100.

**Validates: Requirements 8.3**

---

### Property 16: Over-limit transaction items are highlighted

*For any* transaction in the list whose amount is greater than or equal to the active spending limit, the corresponding `.transaction-item` element shall carry the class `over-limit`.

**Validates: Requirements 8.6**

---

## Error Handling

### Form Validation Errors

Validation errors are inline and field-scoped. `validateForm()` checks all three fields in one pass and returns `false` if any fail, allowing multiple errors to be shown simultaneously. Errors are cleared eagerly on the next `input`/`change` event on the offending field.

### localStorage Errors

`loadTransactions()` wraps `JSON.parse` in a `try/catch` and returns `[]` on any error. Write operations (`saveTransactions`, `saveTheme`, `saveSpendingLimit`) do not currently have try/catch, but Requirement 5.7 specifies they should silently suppress exceptions. The design acknowledges this — any future hardening wraps these calls in try/catch with no side effects on the in-memory state.

### Chart.js Unavailability

`renderChart()` guards with `if (typeof Chart === 'undefined') return;` so a CDN failure degrades gracefully — the chart simply never renders, and the rest of the UI continues to function.

### Invalid Stored Data

- `ebv_theme`: any value that is not exactly `"light"` or `"dark"` falls back to `"dark"`.
- `ebv_spending_limit`: any value that does not parse to a finite number > 0 falls back to `0`.
- `ebv_transactions`: any value that is not parseable JSON falls back to `[]`.

---

## Testing Strategy

Because this application is a pure client-side Vanilla JS project with no build tooling, the recommended test approach uses **Jest** with **jsdom** (or a compatible test runner such as Vitest with jsdom) so that the DOM and `localStorage` can be simulated without a browser.

For property-based tests, use **fast-check** (available as a CDN or npm package). Configure each property test to run a minimum of **100 iterations**.

### Unit Tests (example-based)

Focus on:
- Structural checks: form fields, dropdown options, icon visibility by theme
- Specific edge cases: empty transaction list shows empty state, chart hidden when no data
- CSS class checks: `animate-in` applied to new item, `removing` during delete animation
- Theme toggle: `data-theme` attribute switches, `chart.update()` is called
- `loadTheme()` fallback behavior with invalid/absent localStorage values

### Property-Based Tests

Each property below maps to a correctness property in the design document. Configure each test with:

```js
// Tag format: Feature: expense-budget-visualizer, Property N: <property text>
fc.assert(fc.property(...), { numRuns: 100 });
```

| Property | Test focus | Key generators |
|---|---|---|
| P1 — Valid submission appends | `transactions.length` grows by 1; new item fields match | `fc.string({minLength:1})`, `fc.float({min:0.01})`, `fc.constantFrom('Food','Transport','Fun')` |
| P2 — Whitespace names rejected | `validateForm` returns false; error message set; array unchanged | `fc.string().map(s => s.replace(/\S/g,''))` |
| P3 — Non-positive amounts rejected | `validateForm` returns false; error message set; array unchanged | `fc.oneof(fc.constant(0), fc.float({max:0}), fc.constant(NaN))` |
| P4 — Input clears error | Error span is empty after firing input event | All three field types |
| P5 — List renders one item per transaction | `.transaction-item` count equals array length | `fc.array(transactionArb)` |
| P6 — Delete removes exactly one | Array length decreases by 1; deleted ID absent | `fc.array(transactionArb, {minLength:1})` |
| P7 — Balance equals sum | Displayed text matches `formatCurrency(sum)` | `fc.array(fc.float({min:0.01}))` |
| P8 — Stats bar correctness | Count, avg, top category match computed values | `fc.array(transactionArb, {minLength:1})` |
| P9 — Sort does not mutate | Original array reference unchanged after sort | `fc.array(transactionArb)`, `fc.constantFrom(sortKeys)` |
| P10 — Chart labels match non-zero categories | Chart labels === categories with totals > 0 | `fc.array(transactionArb)` |
| P11 — Tooltip formats Rupiah | Callback output matches expected string pattern | `fc.string({minLength:1})`, `fc.integer({min:1})` |
| P12 — Transaction persistence round-trip | `JSON.parse(localStorage...)` deeply equals in-memory array | `fc.array(transactionArb)` |
| P13 — Spending limit round-trip | `loadSpendingLimit()` returns saved value | `fc.integer({min:1, max:999999999})` |
| P14 — Over-limit card style | `over-limit` class present when sum ≥ limit | `fc.array(transactionArb)`, `fc.integer({min:1})` |
| P15 — Meter percentage | `meterFill.style.width` matches `min(pct,100)%` | `fc.integer({min:1})` for total and limit where total < limit |
| P16 — Over-limit item highlight | Item has `over-limit` class when amount ≥ limit | `fc.array(transactionArb)`, `fc.integer({min:1})` |

### Integration / Smoke Checks

- Page loads in a real browser with Chart.js from CDN — chart renders
- localStorage persists across a manual page reload
- Reduced-motion media query sets animation durations to ≤ 0.01 s
