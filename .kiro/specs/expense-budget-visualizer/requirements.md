# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side single-page application built with plain HTML, CSS, and Vanilla JavaScript. It allows users to log personal expenses by name, amount, and category; view a running total balance; visualize spending distribution through a pie chart; and optionally enforce a monthly spending limit. All data persists across browser sessions using the browser's Local Storage API. No server, build tool, or JavaScript framework is required.

---

## Glossary

- **App**: The Expense & Budget Visualizer single-page application running in the browser.
- **Transaction**: A single expense record containing an item name, a positive monetary amount (in Indonesian Rupiah), a category, and a creation timestamp.
- **Transaction_List**: The scrollable UI panel that renders all stored Transactions in the selected sort order.
- **Form**: The "Add Transaction" input form containing the Item Name, Amount, and Category fields.
- **Validator**: The client-side logic that checks Form field values before a Transaction is committed.
- **Storage**: The browser's `localStorage` API used to persist Transactions, the active theme, and the Spending Limit between sessions.
- **Chart**: The Chart.js doughnut/pie canvas element that displays spending totals grouped by Category.
- **Balance_Card**: The prominent summary card at the top of the App that shows the total amount spent across all Transactions.
- **Stats_Bar**: The three-cell summary row beneath the Balance_Card showing transaction count, top category, and average spend.
- **Spending_Limit**: An optional positive numeric threshold set by the user against which total spending is compared.
- **Theme**: The active color mode of the App, either `light` or `dark`.
- **Category**: One of the three fixed expense types — `Food`, `Transport`, or `Fun`.
- **Sort_Order**: The user-selected ordering applied to the Transaction_List, one of: Newest, Oldest, Highest Amount, Lowest Amount, or Category A-Z.

---

## Requirements

### Requirement 1: Transaction Entry

**User Story:** As a user, I want to add a new expense transaction through a form, so that I can record what I spent money on.

#### Acceptance Criteria

1. THE Form SHALL contain an Item Name text field accepting up to 50 characters, an Amount numeric field, and a Category dropdown with options `Food`, `Transport`, and `Fun`.
2. WHEN the user submits the Form with a valid Item Name, a positive Amount, and a selected Category, THE App SHALL create a new Transaction record with a unique ID and the current timestamp, append it to the stored Transaction list, reset all Form fields to their empty default state, and re-render the Transaction_List, Balance_Card, Stats_Bar, and Chart.
3. IF the user submits the Form with an empty or whitespace-only Item Name field, THEN THE Validator SHALL display the message "Item name is required" beneath the Item Name field and SHALL NOT create a Transaction.
4. IF the user submits the Form with an Amount value that is not a number or is less than or equal to zero, THEN THE Validator SHALL display the message "Enter a valid amount greater than 0" beneath the Amount field and SHALL NOT create a Transaction.
5. IF the user submits the Form with no Category selected, THEN THE Validator SHALL display the message "Please select a category" beneath the Category dropdown and SHALL NOT create a Transaction.
6. WHEN the user triggers an input or change event on a Form field that previously showed a validation error, THE Validator SHALL clear that field's error message.

---

### Requirement 2: Transaction List Display and Deletion

**User Story:** As a user, I want to see all my transactions in a scrollable list and remove individual entries, so that I can review and correct my expense history.

#### Acceptance Criteria

1. THE Transaction_List SHALL render one list item per Transaction, each showing the item name, category badge with a colored dot (where dot color is determined by the category's assigned color), formatted date in `DD Month YYYY` format using the Indonesian locale (e.g., "15 Januari 2024"), formatted amount prefixed with "Rp" using a period as the thousands separator and no decimal places (e.g., "Rp 150.000"), and a delete button.
2. WHEN a new Transaction is added, THE Transaction_List SHALL apply a slide-in entrance animation lasting no more than 300 ms to that Transaction's list item.
3. WHEN the Transaction_List contains no Transactions, THE App SHALL hide the Transaction_List container and display an empty-state message "No transactions yet. Add one above!".
4. WHEN the user clicks the delete button on a Transaction list item, THE App SHALL apply a slide-out exit animation lasting no more than 300 ms to that item, then remove the corresponding Transaction from Storage and re-render the Balance_Card, Stats_Bar, Chart, and Transaction_List.
5. THE Transaction_List SHALL be scrollable vertically and SHALL NOT exceed a maximum rendered height of 400 px, with items beyond that height accessible via scroll.

---

### Requirement 3: Balance and Summary Display

**User Story:** As a user, I want to see my total spending and key summary statistics at a glance, so that I can quickly understand my financial position.

#### Acceptance Criteria

1. WHEN the page loads, THE Balance_Card SHALL display the sum of all stored Transaction amounts formatted as Indonesian Rupiah (e.g., `Rp 150.000`).
2. WHEN the page loads, THE Stats_Bar SHALL display the total count of stored Transactions, the Category with the highest cumulative spend (or "None yet" when no Transactions exist), and the arithmetic mean of all Transaction amounts formatted as Indonesian Rupiah.
3. WHEN no Transactions are stored, THE Balance_Card SHALL display `Rp 0` and THE Stats_Bar SHALL display `0`, `None yet`, and `Rp 0` for count, top category, and average respectively.
4. WHEN a Transaction is added or deleted, THE Balance_Card and Stats_Bar SHALL update their displayed values within the same rendering cycle as the change, before any subsequent user interaction is processed.
5. IF two or more Categories share the highest cumulative spend, THEN THE Stats_Bar SHALL display the Category that was most recently added among the tied Categories as the top category.

---

### Requirement 4: Spending by Category Chart

**User Story:** As a user, I want to see a pie chart of my spending broken down by category, so that I can visualize where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart using the Chart.js library with one segment per Category that has a cumulative spend greater than zero.
2. THE Chart SHALL use the color `#f58f7c` for the `Food` segment, `#f2c4ce` for the `Transport` segment, `#d6d6d6` for the `Fun` segment, and `#a0a0a0` for any Category not in that predefined list.
3. WHEN all Transaction amounts total zero or no Transactions exist, THE App SHALL hide the Chart canvas and display an empty-state message "No expenses to display yet." in its place.
4. WHEN a Transaction is added or deleted, THE Chart SHALL update its data by calling the Chart.js `update()` method on the existing chart instance rather than destroying and recreating it.
5. WHEN the active Theme changes, THE Chart SHALL update its legend text color to the Theme's primary text color and its segment border color to the Theme's card background color as defined by the active Theme's CSS variables.
6. THE Chart tooltip SHALL display each Category label followed by its cumulative spend formatted as Indonesian Rupiah with the prefix `Rp`, a period (`.`) as the thousands separator, and no decimal places (e.g., `Rp 150.000`).

---

### Requirement 5: Data Persistence via Local Storage

**User Story:** As a user, I want my transactions, spending limit, and theme preference to be saved automatically, so that my data is available when I return to the App.

#### Acceptance Criteria

1. WHEN a Transaction is added or deleted, THE Storage SHALL persist the full Transaction array under the key `ebv_transactions` as a JSON string.
2. WHEN the Theme changes, THE Storage SHALL persist the active Theme under the key `ebv_theme` as the string `"light"` or `"dark"`.
3. WHEN the Spending Limit input event fires, THE Storage SHALL persist the Spending Limit value under the key `ebv_spending_limit` as a numeric string representing a value between 0 and 999999999.
4. WHEN the App initializes, THE App SHALL read `ebv_transactions` and restore the Transaction array, falling back to an empty array if the key is absent, the value is not parseable as JSON, or the parsed value is not an array.
5. WHEN the App initializes, THE App SHALL read `ebv_theme` and restore the Theme, falling back to `"dark"` if the key is absent or the stored value is not exactly `"light"` or `"dark"`.
6. WHEN the App initializes, THE App SHALL read `ebv_spending_limit` and restore the Spending Limit, falling back to `0` if the key is absent or the stored value does not convert to a finite number greater than or equal to `0`.
7. IF a Storage write operation throws an exception, THEN THE App SHALL silently suppress the exception and SHALL NOT alter the current in-memory application state.

---

### Requirement 6: Theme Toggle (Dark / Light Mode)

**User Story:** As a user, I want to switch between dark and light color themes, so that I can use the App comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL support two Themes: `light` and `dark`, each defined by a complete set of CSS custom properties applied via the `data-theme` attribute on the `<html>` element.
2. WHEN the user clicks the theme toggle button, THE App SHALL switch the active Theme to the opposite value, persist the new Theme to Storage, and call the Chart.js `update()` method to apply Theme-appropriate legend text and border colors.
3. WHEN the App initializes, THE App SHALL apply the persisted Theme before the page body renders to prevent a flash of the incorrect Theme.
4. IF the active Theme is `light`, THEN THE theme toggle button SHALL display a moon icon.
5. IF the active Theme is `dark`, THEN THE theme toggle button SHALL display a sun icon.
6. THE App SHALL apply CSS transitions of 0.3 seconds to all elements styled via the `data-theme` attribute to avoid abrupt visual changes during Theme switching.
7. WHERE the user's operating system preference is `prefers-reduced-motion: reduce`, THE App SHALL set all animation and transition durations on affected elements to no more than 0.001 seconds.

---

### Requirement 7: Transaction Sort Order

**User Story:** As a user, I want to sort my transaction list by different criteria, so that I can find and review entries in the order most useful to me.

#### Acceptance Criteria

1. THE Transaction_List SHALL provide a sort dropdown with the options: `Newest` (default), `Oldest`, `Highest Amount`, `Lowest Amount`, and `Category A-Z`.
2. WHEN the user changes the sort dropdown selection, THE Transaction_List SHALL re-render all Transactions in the newly selected Sort_Order within 100 milliseconds without altering the underlying stored data.
3. WHILE the Sort_Order is `Newest`, THE Transaction_List SHALL render Transactions in descending order of creation timestamp, with ties broken by descending insertion order.
4. WHILE the Sort_Order is `Oldest`, THE Transaction_List SHALL render Transactions in ascending order of creation timestamp, with ties broken by ascending insertion order.
5. WHILE the Sort_Order is `Highest Amount`, THE Transaction_List SHALL render Transactions in descending order of amount, with ties broken by descending insertion order.
6. WHILE the Sort_Order is `Lowest Amount`, THE Transaction_List SHALL render Transactions in ascending order of amount, with ties broken by descending insertion order.
7. WHILE the Sort_Order is `Category A-Z`, THE Transaction_List SHALL render Transactions sorted alphabetically by Category name using the browser's default locale string comparison, with ties broken by descending insertion order.

---

### Requirement 8: Spending Limit

**User Story:** As a user, I want to set a monthly spending limit, so that I can be warned when my total expenses approach or exceed my budget.

#### Acceptance Criteria

1. THE App SHALL provide a numeric input field for the user to enter a Spending Limit value as a whole number between 1 and 999,999,999 Indonesian Rupiah.
2. WHEN the user enters a valid positive Spending Limit and the total of all Transaction amounts is greater than or equal to that limit, THE Balance_Card SHALL switch to its "over-limit" visual style (red gradient) and SHALL display a warning message stating the amount by which the limit has been exceeded.
3. WHEN a Spending Limit is set and total spending is strictly less than the limit, THE Balance_Card SHALL display a progress meter showing the percentage of the limit consumed, rounded down to the nearest whole number, and a text summary (e.g., "60% of your limit used (Rp 300.000 of Rp 500.000)").
4. WHEN a Spending Limit is set and total spending is strictly less than the limit, THE Balance_Card SHALL NOT apply the over-limit visual style.
5. WHEN the Spending Limit input value is zero, negative, whitespace-only, or empty, THE App SHALL treat the Spending Limit as not set, hide the progress meter, and remove any over-limit warnings.
6. WHEN a Spending Limit is active and a single Transaction's amount is greater than or equal to the Spending Limit, THE Transaction_List SHALL render that Transaction's list item with a red left border accent and a danger background tint to visually distinguish it.
7. WHEN the user changes the Spending Limit value, THE Balance_Card and Transaction_List SHALL update their displays within 300 milliseconds to reflect the new limit without requiring a page reload.
