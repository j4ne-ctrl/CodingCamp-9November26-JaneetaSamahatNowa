# Implementation Plan: Expense & Budget Visualizer — Test Suite

## Overview

The application source (`index.html`, `css/style.css`, `js/script.js`) is already complete. This plan covers only the creation of a comprehensive test suite using **Vitest** with the **jsdom** environment and **fast-check** for property-based testing. No existing source files are modified.

The test suite mirrors the Testing Strategy section of the design document and validates all 16 correctness properties, plus example-based unit tests for every UI component.

---

## Tasks

- [ ] 1. Scaffold the test environment
  - [ ] 1.1 Create `package.json` and install Vitest, jsdom, and fast-check
    - Create `package.json` at the workspace root with `"type": "module"` and a `"test"` script that runs `vitest --run`
    - Add dev dependencies: `vitest`, `@vitest/coverage-v8`, `jsdom`, `fast-check`
    - Create `vitest.config.js` at the workspace root that sets `environment: 'jsdom'`, `globals: true`, and points `include` at `tests/**/*.test.js`
    - _Requirements: Testing Strategy (design.md)_

  - [ ] 1.2 Create the test helper module `tests/helpers.js`
    - Export a `setupDOM()` function that reads `index.html` via `fs.readFileSync`, sets `document.body.innerHTML` to its `<body>` contents, and stubs `localStorage` with a plain in-memory Map
    - Export a `loadScript()` function that dynamically imports `js/script.js` after the DOM is set up (re-import trick with a cache-bust query param so each test file gets a fresh module)
    - Export `transactionArb`: a fast-check arbitrary that generates valid transaction objects `{id, name, amount, category, date}` using `fc.record`
    - Export `formatCurrency(n)` mirroring the app's `formatCurrency` so assertions can produce expected strings without duplicating locale logic
    - _Requirements: Testing Strategy (design.md)_

- [ ] 2. Write unit tests — Form component
  - [ ] 2.1 Write example-based tests for `validateForm` and form submission
    - Test: form has `#itemName`, `#amount`, `#category` inputs and a submit button
    - Test: submitting with valid data appends one transaction, resets fields, and updates `#totalBalance`
    - Test: submitting with an empty item name shows "Item name is required" in `#nameError` and does NOT append
    - Test: submitting with amount `0` or negative shows "Enter a valid amount greater than 0" in `#amountError`
    - Test: submitting with no category selected shows "Please select a category" in `#categoryError`
    - Test: `input` event on `#itemName` after a name error clears `#nameError`
    - Test: `input` event on `#amount` after an amount error clears `#amountError`
    - Test: `change` event on `#category` after a category error clears `#categoryError`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.2 Write property test — P2: Whitespace names are rejected
    - **Property 2: Whitespace-only names are rejected**
    - Use `fc.string().map(s => s.replace(/\S/g, ''))` to generate whitespace-only strings
    - Assert `validateForm()` returns `false`, `#nameError` text equals "Item name is required", and `transactions` array is unchanged
    - **Validates: Requirements 1.3**

  - [ ]* 2.3 Write property test — P3: Non-positive amounts are rejected
    - **Property 3: Non-positive amounts are rejected**
    - Use `fc.oneof(fc.constant(0), fc.float({max: 0}), fc.constant(NaN))` for the amount input
    - Assert `validateForm()` returns `false`, `#amountError` text equals "Enter a valid amount greater than 0", and array is unchanged
    - **Validates: Requirements 1.4**

  - [ ]* 2.4 Write property test — P4: Input event clears the corresponding error
    - **Property 4: Input event clears the corresponding field's error**
    - For each of the three fields, first trigger a failed submission to set an error, then fire `input` / `change`, then assert the error span is empty
    - Use `fc.boolean()` to randomise which field combination is tested
    - **Validates: Requirements 1.6**

  - [ ]* 2.5 Write property test — P1: Valid submission appends exactly one transaction
    - **Property 1: Valid transaction submission appends to the list**
    - Use `fc.string({minLength: 1})` for name, `fc.float({min: 0.01, max: 1e9})` for amount, `fc.constantFrom('Food','Transport','Fun')` for category
    - Assert `transactions.length` grows by exactly 1; new entry `.name`, `.amount`, `.category` match inputs
    - **Validates: Requirements 1.2**

- [ ] 3. Write unit tests — Balance Card and Stats Bar
  - [ ] 3.1 Write example-based tests for `renderBalance`
    - Test: with no transactions `#totalBalance` shows "Rp 0", `#statCount` is "0", `#statTop` is "None yet", `#statAvg` is "Rp 0"
    - Test: with one Food transaction of 150000, `#totalBalance` shows "Rp 150.000"
    - Test: `#statAvg` equals total / count formatted as Rupiah
    - Test: when spending limit > total, `#meterBlock` is visible and `#meterFill` width is non-zero
    - Test: when spending limit ≤ total, `#balanceCard` has class `over-limit` and `#balanceWarning` is visible
    - Test: when spending limit is 0 / empty, `#meterBlock` is hidden and `over-limit` class is absent
    - _Requirements: 3.1, 3.2, 3.3, 8.2, 8.3, 8.5_

  - [ ]* 3.2 Write property test — P7: Balance equals sum of all transaction amounts
    - **Property 7: Balance equals the sum of all transaction amounts**
    - Use `fc.array(fc.integer({min: 1, max: 1000000}))` to generate random amount lists; set `transactions` directly then call `renderBalance()`
    - Assert `#totalBalance.textContent` equals `formatCurrency(sum)`
    - **Validates: Requirements 3.1**

  - [ ]* 3.3 Write property test — P8: Stats Bar reflects array state
    - **Property 8: Stats Bar reflects array state correctly**
    - Use `fc.array(transactionArb, {minLength: 1})`; call `renderBalance()` then assert count, avg, and top category
    - Tie-breaking: when two categories share top total, the last-added category wins
    - **Validates: Requirements 3.2**

  - [ ]* 3.4 Write property test — P14: Over-limit card style applied
    - **Property 14: Over-limit balance card when total exceeds limit**
    - Generate a transaction array and limit where `sum >= limit` using `fc.array(transactionArb)` and `fc.integer({min:1})`
    - Assert `#balanceCard` has class `over-limit` and `#balanceWarning` is not hidden
    - **Validates: Requirements 8.2**

  - [ ]* 3.5 Write property test — P15: Meter percentage is correct
    - **Property 15: Progress meter percentage is correct**
    - Generate `total` and `limit` where `0 < total < limit` using `fc.integer` constraints
    - Assert `#meterFill` style width equals `Math.round((total / limit) * 100) + '%'`
    - **Validates: Requirements 8.3**

- [ ] 4. Write unit tests — Transaction List
  - [ ] 4.1 Write example-based tests for `renderList`
    - Test: with no transactions, `#listEmpty` is visible and no `.transaction-item` elements exist
    - Test: with two transactions, two `.transaction-item` elements are rendered
    - Test: each item shows the transaction name, a badge with the category, the date in `DD Month YYYY` Indonesian locale, and the amount prefixed with "Rp"
    - Test: a transaction whose amount exceeds the spending limit renders with class `over-limit` on its item
    - Test: sort option `amountDesc` renders items highest-to-lowest
    - Test: sort option `category` renders items alphabetically by category
    - _Requirements: 2.1, 2.3, 7.1, 7.3, 7.7, 8.6_

  - [ ]* 4.2 Write property test — P5: List renders one item per transaction
    - **Property 5: Transaction list renders one item per transaction**
    - Use `fc.array(transactionArb)` to generate random arrays; call `renderList()` then count `.transaction-item` elements
    - Assert count equals array length; each item contains the transaction name and formatted amount
    - **Validates: Requirements 2.1**

  - [ ]* 4.3 Write property test — P9: Sort does not mutate the source array
    - **Property 9: Sort does not mutate the source array**
    - Use `fc.array(transactionArb)` and `fc.constantFrom('newest','oldest','amountDesc','amountAsc','category')`
    - Capture a deep copy of `transactions` before calling `getSortedTransactions()`; assert the original is unchanged after the call
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**

  - [ ]* 4.4 Write property test — P16: Over-limit transaction items are highlighted
    - **Property 16: Over-limit transaction items are highlighted**
    - Generate a transaction array and spending limit where at least one transaction's amount ≥ limit
    - Assert every such `.transaction-item` carries class `over-limit`
    - **Validates: Requirements 8.6**

- [ ] 5. Checkpoint — Run tests for tasks 2–4
  - Ensure all tests pass. Ask the user if questions arise.

- [ ] 6. Write unit tests — Delete and animations
  - [ ] 6.1 Write example-based tests for transaction deletion
    - Test: clicking `.btn-delete` on a list item adds class `removing` to that item
    - Test: after the `animationend` event fires (or the 300 ms fallback), the transaction is removed from `localStorage` and `renderAll()` re-renders with one fewer item
    - Test: deleting the last transaction shows the empty state
    - _Requirements: 2.2, 2.4_

  - [ ]* 6.2 Write property test — P6: Deleting a transaction removes exactly that entry
    - **Property 6: Deleting a transaction removes exactly that entry**
    - Use `fc.array(transactionArb, {minLength: 1})` and `fc.nat()` to pick a random index
    - Assert after deletion: array length decreases by 1 and the deleted ID is absent in both the in-memory array and `localStorage`
    - **Validates: Requirements 2.4**

- [ ] 7. Write unit tests — Chart component
  - [ ] 7.1 Write example-based tests for `renderChart`
    - Stub `Chart` with a vi.fn() factory that records constructor calls and exposes `update`, `destroy` on the returned instance
    - Test: with no transactions, `#chartWrapper` is hidden and `#chartEmpty` is visible; Chart constructor is never called
    - Test: with one Food transaction, Chart constructor is called with `type: 'pie'` and one label `'Food'`
    - Test: adding a second category calls `chart.update()` and NOT the constructor again (instance reuse)
    - Test: switching theme calls `renderChart()` which calls `chart.update()` with updated legend text color
    - Test: tooltip label callback returns `"Food: Rp 150.000"` for a 150000 Food amount
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 7.2 Write property test — P10: Chart segments match categories with positive spend
    - **Property 10: Chart segments match categories with positive spend**
    - Use `fc.array(transactionArb)` to generate random transaction sets; call `renderChart()` and inspect captured Chart constructor args
    - Assert the labels array equals `CATEGORIES.filter(c => getCategoryTotals()[c] > 0)`
    - **Validates: Requirements 4.1**

  - [ ]* 7.3 Write property test — P11: Tooltip callback formats amounts as Rupiah
    - **Property 11: Tooltip callback formats amounts as Rupiah**
    - Use `fc.string({minLength:1})` for label and `fc.integer({min:1, max:999999999})` for amount
    - Invoke the tooltip callback directly with `{label, parsed: amount}` and assert the return value equals `label + ': ' + formatCurrency(amount)`
    - **Validates: Requirements 4.6**

- [ ] 8. Write unit tests — Theme Toggle
  - [ ] 8.1 Write example-based tests for `handleThemeToggle`
    - Test: clicking `#themeToggle` when `data-theme="light"` sets `data-theme="dark"` on `<html>`
    - Test: clicking `#themeToggle` when `data-theme="dark"` sets `data-theme="light"` on `<html>`
    - Test: the new theme is persisted to `localStorage` under key `ebv_theme`
    - Test: `.icon-moon` is visible (non-hidden by CSS) in light mode; `.icon-sun` is visible in dark mode
    - Test: `chart.update()` is called after every theme toggle
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ] 9. Write unit tests — Spending Limit
  - [ ] 9.1 Write example-based tests for the spending limit input
    - Test: entering a valid limit and setting total < limit shows the meter and descriptive text
    - Test: meter text format matches "60% of your limit used (Rp X of Rp Y)"
    - Test: clearing the limit field (empty / 0) hides the meter and removes `over-limit` from balance card
    - Test: changing the limit value within 300 ms of a previous change still triggers a re-render (debounce not applied — input fires synchronously)
    - _Requirements: 8.1, 8.3, 8.5, 8.7_

- [ ] 10. Write unit tests — localStorage persistence
  - [ ] 10.1 Write example-based tests for Storage functions
    - Test: `loadTransactions()` returns `[]` when `localStorage` is empty
    - Test: `loadTransactions()` returns `[]` when stored value is not parseable JSON
    - Test: `loadTransactions()` returns `[]` when stored value is valid JSON but not an array
    - Test: `loadTheme()` returns `"dark"` when key is absent
    - Test: `loadTheme()` returns `"dark"` for any stored value that is not exactly `"light"` or `"dark"`
    - Test: `loadSpendingLimit()` returns `0` when key is absent or value is non-numeric
    - _Requirements: 5.4, 5.5, 5.6_

  - [ ]* 10.2 Write property test — P12: Transaction persistence round-trip
    - **Property 12: Transaction persistence round-trip**
    - Use `fc.array(transactionArb)` to generate random sequences of add/delete operations
    - After each mutation, assert `JSON.parse(localStorage.getItem('ebv_transactions'))` deeply equals the in-memory `transactions` array
    - **Validates: Requirements 5.1, 5.4**

  - [ ]* 10.3 Write property test — P13: Spending limit persistence round-trip
    - **Property 13: Spending limit persistence round-trip**
    - Use `fc.integer({min: 1, max: 999999999})`
    - Call `saveSpendingLimit(n)` then `loadSpendingLimit()` and assert the returned value equals `n`
    - **Validates: Requirements 5.3, 5.6**

- [ ] 11. Write integration / smoke tests
  - [ ] 11.1 Write integration tests for end-to-end flows
    - Test: `init()` with pre-populated `localStorage` restores transactions, spending limit, and theme before first render
    - Test: full add → verify UI → delete → verify UI flow in a single jsdom session
    - Test: `Chart` unavailable (delete `window.Chart`) — `init()` completes without throwing and balance/list still render correctly
    - Test: `localStorage.setItem` throwing a `QuotaExceededError` during `saveTransactions` does NOT alter the in-memory array (silent suppress per Requirement 5.7)
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 4.3_

- [ ] 12. Final checkpoint — Full test run
  - Run `npm test` (which executes `vitest --run`) and ensure all tests pass with zero failures. Ask the user if any tests require adjustment.

---

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for a faster unit-test-only pass
- Each task references the specific design properties and requirement clauses it validates
- `tests/helpers.js` is shared infrastructure used by all test files — complete task 1.2 before writing any test assertions
- The source files `index.html`, `css/style.css`, and `js/script.js` are **not modified** by any task
- Vitest is chosen over Jest because it natively supports ES modules without a Babel transform, matching the project's `"type": "module"` configuration
- Run tests with `npx vitest --run` (single pass) or `npx vitest` for watch mode

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1", "4.1", "6.1", "7.1", "8.1", "9.1", "10.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.2", "3.3", "3.4", "3.5", "4.2", "4.3", "4.4", "6.2", "7.2", "7.3", "10.2", "10.3"] },
    { "id": 4, "tasks": ["11.1"] }
  ]
}
```
