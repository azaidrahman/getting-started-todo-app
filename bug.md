all bugs seen to be documented here. no deletions. detailed before after. no coding.

---

## BUG 1 — ReferenceError: undefined variable `category` in updateItem route (UPDATED)

**File:** `backend/src/routes/updateItem.js:10`

**Description:** The variable `category` is passed as a third argument to `db.updateItem()` but is never defined anywhere in the file (previously named `catego`, now renamed to `category` but still undefined). This throws a `ReferenceError: category is not defined` at runtime, completely breaking the update functionality. Additionally, `db.updateItem()` (in both MySQL and SQLite) only accepts 2 parameters (`id` and `item`), so the extra argument is an API mismatch. The imported `normalizeCategory` function is never used.

**BEFORE:** Server crashes with `ReferenceError` when any PUT request is made to `/api/items/:id`. The entire update route is non-functional.

**AFTER:** The route should pass a properly constructed updates object (with normalized category) and call `db.updateItem(req.params.id, updates)` with only 2 arguments.

**Severity:** CRITICAL

**Status:** STILL EXISTS (variable renamed from `catego` to `category` but remains undefined)

---

## BUG 2 — Empty `client/src/categories.js` file (FIXED)

**File:** `client/src/categories.js` (entire file is empty)

**Description:** This file is completely empty. Both `AddNewItemForm.jsx` (line 6) and `TodoListCard.jsx` (line 5) import `CATEGORIES` and/or `DEFAULT_CATEGORY` from this file. Since the file exports nothing, these imports are `undefined`. This causes `CATEGORIES.map(...)` to throw `TypeError: Cannot read properties of undefined (reading 'map')` when either component renders.

**BEFORE:** The entire client application crashes on render. The category dropdown and filter dropdown never appear; the app is broken.

**AFTER:** The file should export `CATEGORIES`, `DEFAULT_CATEGORY`, and `normalizeCategory` (similar to the backend's `categories.js`):
```js
export const CATEGORIES = ['work', 'personal', 'shopping'];
export const DEFAULT_CATEGORY = 'personal';
```

**Severity:** CRITICAL

**Status:** FIXED — File now exports `CATEGORIES`, `DEFAULT_CATEGORY`, and `formatCategoryLabel`. No longer empty.

---

## BUG 3 — Null reference: `items.filter()` called before null check in TodoListCard (FIXED)

**File:** `client/src/components/TodoListCard.jsx:44`

**Description:** `items` is initialized as `null` via `useState(null)` on line 8. On line 44, `items.filter(...)` is called unconditionally. The null guard `if (items === null) return 'Loading...'` on line 48 comes AFTER the `.filter()` call. In React, the entire function body executes top-to-bottom, so `items.filter()` throws `TypeError: Cannot read properties of null (reading 'filter')` before the early return can protect it.

**BEFORE:** Component crashes on initial render with `TypeError`. The loading state is never reached.

**AFTER:** The null check on line 48 must be moved before line 44, or line 44 should use optional chaining: `const filteredItems = items?.filter(...) ?? [];`

**Severity:** CRITICAL

**Status:** FIXED — Null check on line 44 now correctly placed BEFORE the `items.filter()` call on line 46. Order was reversed from original bug description.

---

## BUG 4 — SQLite `updateItem` SQL parameter order mismatch (FIXED)

**File:** `backend/src/persistence/sqlite.js:118-121`

**Description:** The SQL query now has 4 placeholders (`name=?, category=?, completed=? WHERE id=?`), but the parameter array has the WRONG ORDER: `[item.name, item.completed ? 1 : 0, normalizeCategory(item.category), id]`. The SQL expects `(name, category, completed, id)` but params are supplied as `(name, completed, category, id)`. The `completed` value gets written into the `category` column and vice versa.

**BEFORE:** The SQLite `updateItem` silently swaps category and completed values. When you complete an item, its completion state is lost and its category is corrupted.

**AFTER:** The parameter array should match SQL placeholder order: `[item.name, normalizeCategory(item.category), item.completed ? 1 : 0, id]`

**Severity:** HIGH

**Status:** FIXED — `sqlite.js:120-121` — SQL and params now correctly ordered: `[item.name, normalizeCategory(item.category), item.completed ? 1 : 0, id]`. Parameters match placeholder order.

---

## BUG 5 — MySQL persistence `priority` column has syntax error and missing value (FIXED)

**File:** `backend/src/persistence/mysql.js:43-48` (schema), `:96-107` (storeItem), `:66-78` (getItems)

**Description:** The MySQL `CREATE TABLE` now includes a `priority` column (line 47), and the INSERT column list includes `priority`. BUT the `priority` column definition has no data type (`priority,` instead of `priority VARCHAR(20)`), causing a SQL syntax error on table creation. Additionally, the VALUES array has only 4 values for 5 columns — `[item.id, item.name, item.completed ? 1 : 0, normalizeCategory(item.category)]` — the priority value is missing. This causes a SQL parameter count mismatch error.

**BEFORE:** The MySQL schema fails to create (syntax error on `priority,`). If the table somehow exists, `storeItem` throws a SQL parameter count mismatch error (5 columns, 4 values). Priority is never persisted.

**AFTER:** The MySQL schema should define `priority` with a proper data type (e.g., `priority VARCHAR(20)`), and `storeItem` should include the priority value in the VALUES array with 5 placeholders.

**Severity:** HIGH

**Status:** FIXED — `mysql.js:47` — `priority` now has `VARCHAR(20)` type. `mysql.js:102-103` — 5 placeholders and 5 values including `item.priority`.

---

## BUG 6 — SQLite persistence partially stores `priority` but doesn't retrieve it (FIXED)

**File:** `backend/src/persistence/sqlite.js:26-32` (schema), `:103-114` (storeItem), `:71-84` (getItems)

**Description:** The SQLite `CREATE TABLE` now includes `priority varchar(20)` (line 29). `storeItem` now inserts `priority` with 5 placeholders (line 107-108). BUT `getItems` and `getItem` do not return the `priority` field from the database — they only map `completed` and `category`. Also, there's a missing comma between `priority varchar(20)` (line 29) and `completed boolean,` (line 30) in the CREATE TABLE, which will cause a SQL syntax error on fresh database creation.

**BEFORE:** Priority is stored but never returned. Items from SQLite have no `priority` field. On fresh DB creation, syntax error from missing comma.

**AFTER:** `getItems` and `getItem` should include `priority` in the returned object. Fix the missing comma in CREATE TABLE between `priority varchar(20)` and `completed boolean`.

**Severity:** HIGH

**Status:** FIXED — `sqlite.js:29` now has trailing comma: `priority varchar(20),`. Also `getItems`/`getItem` return `priority` naturally via `SELECT *` with `Object.assign({}, item, ...)` which includes all database columns.

---

## BUG 7 — MySQL `getItems` and `getItem` do not normalize category

**File:** `backend/src/persistence/mysql.js:66-78` (getItems), `:81-94` (getItem)

**Description:** The MySQL versions of `getItems()` and `getItem()` do not call `normalizeCategory()` on the returned items' category field. The SQLite versions correctly call `normalizeCategory(item.category)`. If any item has a NULL or invalid category value in MySQL, it will be returned as-is rather than being normalized to the default.

**BEFORE:** Items with NULL or invalid categories in MySQL are returned with raw NULL/invalid values, causing UI inconsistencies between MySQL and SQLite backends.

**AFTER:** Both `getItems` and `getItem` in mysql.js should include `category: normalizeCategory(item.category)` in the `Object.assign()` call.

**Severity:** MEDIUM

**Status:** FIXED — `mysql.js:75` and `mysql.js:91` — Both `getItems` and `getItem` now call `normalizeCategory(item.category)`.

---

## BUG 8 — Duplicate/conflicting imports in AddNewItemForm.jsx

**File:** `client/src/components/AddNewItemForm.jsx:3-5`

**Description:** `Button` and `Form` are imported twice:
- Line 3: `import Button from 'react-bootstrap/Button';`
- Line 4: `import Form from 'react-bootstrap/Form';`
- Line 5: `import { InputGroup, Form, Button } from 'react-bootstrap';`

The named imports on line 5 shadow the default imports on lines 3-4. While this may work in practice, it is confusing and non-idiomatic, and could cause subtle differences if the default and named exports diverge.

**BEFORE:** Working but confusing code with shadowed imports. Potential for subtle bugs if default and named exports differ.

**AFTER:** Use only one import style — either all default imports or all named imports from `react-bootstrap`.

**Severity:** LOW

**Status:** FIXED — `AddNewItemForm.jsx:3` — Duplicate imports consolidated to single named import `{ InputGroup, Form, Button } from 'react-bootstrap'`.

---

## BUG 9 — Missing error handling in AddNewItemForm fetch (FIXED)

**File:** `client/src/components/AddNewItemForm.jsx:23-30`

**Description:** The `fetch('/api/items', options)` call has no `.catch()` handler. If the network request fails or the server returns an error response, `setSubmitting(false)` is never called, leaving the button permanently in the disabled "Adding..." state. The user cannot retry.

**BEFORE:** On any fetch failure (network error, server error), the submit button stays disabled forever showing "Adding...". The user must refresh the page to recover.

**AFTER:** Add a `.catch()` handler that calls `setSubmitting(false)` and optionally displays an error message.

**Severity:** MEDIUM

**Status:** FIXED — `AddNewItemForm.jsx:30` — `.catch()` now correctly implemented with arrow function: `.catch(() => setSubmitting(false))`. Also, `priority` now included in POST body (line 17).

---

## BUG 10 — Missing error handling in ItemDisplay toggleCompletion fetch (FIXED)

**File:** `client/src/components/ItemDisplay.jsx:28-38`

**Description:** The `fetch` call in `toggleCompletion()` has no `.catch()` handler. If the PUT request fails, the UI state is not updated and the user gets no feedback. The item remains in its pre-toggle visual state with no indication of failure.

**BEFORE:** On fetch failure, the checkbox toggle appears to do nothing. No error feedback to the user.

**AFTER:** Add a `.catch()` handler that provides error feedback and optionally reverts the UI state.

**Severity:** MEDIUM

**Status:** FIXED — `ItemDisplay.jsx:39` — `.catch()` now has proper error handler: `.catch(err => console.error('Failed to toggle item:', err))`.

---

## BUG 11 — Missing error handling in ItemDisplay removeItem fetch (optimistic deletion) (REGRESSED — new syntax error)

**File:** `client/src/components/ItemDisplay.jsx:42-48`

**Description:** The `fetch` call in `removeItem()` has no `.catch()` handler. If the DELETE request fails, `onItemRemoval(item)` is still called, removing the item from the UI even though it still exists on the server. The next page refresh will show the "deleted" item again.

**BEFORE:** On DELETE failure, the item disappears from the UI but still exists on the server. It reappears on the next page load, confusing the user.

**AFTER:** `.catch()` with a callback that confirms success before calling `onItemRemoval`.

**Severity:** HIGH

**Status:** MODIFIED — Error handling added at lines 43-48 with proper `.then()`/`.catch()` chain, BUT a new **SYNTAX ERROR** was introduced on line 43: `fetch(...)then(r => {` is missing the `.` before `then`. Should be `fetch(...).then(r => {`. This causes a runtime `TypeError`.

**Suggested fix:** Add the missing dot: `fetch(`/api/items/${item.id}`, { method: 'DELETE' }).then(r => {`

---

## BUG 12 — Missing error handling in Greeting fetch

**File:** `client/src/components/Greeting.jsx:7-9`

**Description:** The `fetch('/api/greeting')` call has no `.catch()` handler. If the request fails, `greeting` remains `null` and the component renders nothing (returns null). The user sees no greeting with no indication of why.

**BEFORE:** On fetch failure, the greeting silently disappears. No error feedback.

**AFTER:** Add a `.catch()` handler that sets an error state or fallback greeting.

**Severity:** LOW

**Status:** STILL EXISTS — Unchanged. No `.catch()` on Greeting fetch.

**Suggested `.catch()` solution:** Add `.catch()` with a fallback greeting:
```js
fetch('/api/greeting')
    .then((res) => res.json())
    .then((data) => setGreeting(data.greeting))
    .catch(() => setGreeting('Hello!'));
```

---

## BUG 13 — Missing error handling in TodoListCard initial fetch

**File:** `client/src/components/TodoListCard.jsx:11-15`

**Description:** The initial `fetch('/api/items')` in `useEffect` has no `.catch()` handler. If the request fails, `items` remains `null` forever and the component is stuck showing "Loading..." indefinitely.

**BEFORE:** On fetch failure, the app is permanently stuck on "Loading..." with no error message or recovery option.

**AFTER:** Add a `.catch()` handler that sets an error state and displays an error message.

**Severity:** MEDIUM

**Status:** STILL EXISTS — Unchanged. No `.catch()` on TodoListCard initial fetch.

**Suggested `.catch()` solution:** Add `.catch()` with error state and fallback to empty array:
```js
fetch('/api/items')
    .then(r => r.json())
    .then(data => setItems(data))
    .catch(err => { console.error('Failed to load items:', err); setItems([]); });
```

---

## BUG 14 — Missing error handling in deleteItem route

**File:** `backend/src/routes/deleteItem.js:3-5`

**Description:** The route has no try/catch or error handling. If `db.removeItem(req.params.id)` throws (e.g., database error, or item doesn't exist), the error propagates as an unhandled promise rejection, potentially crashing the server.

**BEFORE:** Database errors or invalid IDs cause unhandled promise rejections. The server may crash or return no response.

**AFTER:** Wrap in try/catch and return an appropriate error status (e.g., 404 for not found, 500 for database errors).

**Severity:** HIGH

**Status:** STILL EXISTS — Unchanged. No try/catch in deleteItem route.

---

## BUG 15 — Missing error handling in getItems route

**File:** `backend/src/routes/getItems.js:3-5`

**Description:** No try/catch around `db.getItems()`. If the database query fails, the error propagates as an unhandled promise rejection.

**BEFORE:** Database errors cause unhandled promise rejections with no meaningful HTTP response to the client.

**AFTER:** Wrap in try/catch and return a 500 status with error details.

**Severity:** MEDIUM

**Status:** STILL EXISTS — Unchanged. No try/catch in getItems route.

---

## BUG 16 — No input validation in addItem route

**File:** `backend/src/routes/addItem.js:6-17`

**Description:** The route does not validate that `req.body.name` exists or is non-empty. If a client sends `{}` or `{ category: 'work' }` without a `name`, the item is stored with `name: undefined`. No validation of request body structure at all.

**BEFORE:** Items can be created with `undefined` or empty names. The database stores NULL for the name field.

**AFTER:** Validate that `req.body.name` exists and is a non-empty string. Return 400 if validation fails.

**Severity:** MEDIUM

**Status:** STILL EXISTS — Unchanged. No validation of `req.body.name` in addItem.

---

## BUG 17 — fs.readFileSync returns Buffer instead of string in mysql.js (Docker secrets)

**File:** `backend/src/persistence/mysql.js:20-23`

**Description:** `fs.readFileSync(HOST_FILE)` returns a `Buffer` object, not a string. When this Buffer is passed to the MySQL connection pool as `host`, `user`, `password`, or `database`, it causes connection failures or unexpected behavior. The Buffer should be converted to a string using `.toString('utf8')` or by passing `{ encoding: 'utf8' }` to `readFileSync`.

**BEFORE:** When using Docker secrets (FILE env vars), the database connection fails or behaves unpredictably because Buffer objects are passed instead of strings.

**AFTER:** Use `fs.readFileSync(HOST_FILE, 'utf8').trim()` or `.toString('utf8').trim()` for all file reads.

**Severity:** HIGH

**Status:** STILL EXISTS — Unchanged. `fs.readFileSync()` still returns Buffer, no `.toString()`.

---

## BUG 18 — Priority state defined but never used in AddNewItemForm (PARTIALLY FIXED) (PARTIALLY FIXED)

**File:** `client/src/components/AddNewItemForm.jsx:11`

**Description:** `const [priority, setPriority] = useState('medium')` is defined but `priority` is never included in the POST body (`body: JSON.stringify({ name: newItem, category })`) and there is no UI control to change the priority. The state variable is dead code.

**BEFORE:** Items are always created with "medium" priority regardless of what the backend expects. Users have no way to set priority when adding items.

**AFTER:** Either remove the unused state or add a priority selector to the form and include it in the POST body.

**Severity:** MEDIUM

**Status:** PARTIALLY FIXED — `priority` now included in POST body (line 17: `{ name: newItem, category, priority }`). `setPriority('')` called on success (line 28). BUT there is still no UI control (dropdown/slider) for users to select priority — always defaults to `'medium'`.

**Suggested solution:** Add a `Form.Select` for priority between the category selector and the submit button:
```js
<Form.Select value={priority} onChange={(e) => setPriority(e.target.value)}>
    <option value="low">Low</option>
    <option value="medium">Medium</option>
    <option value="high">High</option>
</Form.Select>
```

---

## BUG 19 — Duplicate checkbox icons rendered in ItemDisplay (FIXED)

**File:** `client/src/components/ItemDisplay.jsx:62-68`

**Description:** The toggle button renders both a `FontAwesomeIcon` component AND a raw `<i>` element for the same checkbox. This causes two checkbox icons to be displayed side-by-side for every todo item.

**BEFORE:** Each todo item shows two checkbox icons (one FontAwesomeIcon + one raw `<i>` element) instead of one.

**AFTER:** Remove one of the two icon implementations. Only one checkbox icon should be rendered per item.

**Severity:** MEDIUM

**Status:** FIXED — `ItemDisplay.jsx:66-69` — Raw `<i>` element removed. Only `FontAwesomeIcon` remains.

---

## BUG 20 — PropTypes for ItemDisplay missing `priority` field

**File:** `client/src/components/ItemDisplay.jsx:96-104`

**Description:** The PropTypes shape for `item` includes `id`, `name`, `completed`, and `category`, but omits `priority`. However, `item.priority` is used in the `PriorityBadge` component. This means PropTypes validation will not warn when `priority` is missing.

**BEFORE:** No PropTypes warning when `item.priority` is undefined. The PriorityBadge silently falls back to "Medium" due to the `??` operator.

**AFTER:** Add `priority: PropTypes.string` to the item PropTypes shape.

**Severity:** LOW

**Status:** FIXED — `ItemDisplay.jsx:102` — PropTypes now includes `priority: PropTypes.string`.

---

## BUG 21 — Unused `React` import in ItemDisplay

**File:** `client/src/components/ItemDisplay.jsx:11`

**Description:** `import React from 'react'` is present but unnecessary. With the modern JSX transform (configured via Vite with `@vitejs/plugin-react`), React does not need to be in scope for JSX to work.

**BEFORE:** Unused import adds a tiny amount of bundle size. No functional impact.

**AFTER:** Remove the unused `import React from 'react'` line.

**Severity:** LOW

**Status:** STILL EXISTS — Unchanged. Unused `import React from 'react'` on line 11.

---

## BUG 22 — Unconventional import ordering in ItemDisplay

**File:** `client/src/components/ItemDisplay.jsx:24`

**Description:** `import Badge from 'react-bootstrap/Badge'` appears between the `PriorityBadge` function definition and the `ItemDisplay` export. While JavaScript hoists imports and this works, it violates conventional coding style and makes the code harder to read. All imports should be at the top of the file.

**BEFORE:** Code works but is confusingly organized.

**AFTER:** Move the `Badge` import to the top of the file with the other imports.

**Severity:** LOW

**Status:** STILL EXISTS — Unchanged. `Badge` import still on line 24, between function and export.

---

## BUG 23 — Greeting text contains placeholder/debug values

**File:** `backend/src/routes/getGreeting.js:1-5`

**Description:** The `GREETINGS` array contains placeholder/debug values: `"Welcome1"` (with a trailing digit typo), `"dsadad!"` (nonsense string), and `"yoyo!"`. These look like test strings that were never replaced with proper greeting messages.

**BEFORE:** Users see random nonsense greetings like "dsadad!" and "Welcome1" (with a typo).

**AFTER:** Replace with proper greeting messages like "Welcome!", "Hello!", "Good day!", etc.

**Severity:** LOW

**Status:** STILL EXISTS — Unchanged. Still `"Welcome1"`, `"dsadad!"`, `"yoyo!"`.

---

## BUG 24 — updateItem.spec.js test has incorrect expectation for category (FIXED)

**File:** `backend/spec/routes/updateItem.spec.js:23-28`

**Description:** The test sends `category: 'work'` in the request body but expects `category: 'personal'` in the update call. Since `'work'` is a valid category, there is no reason for it to be changed to `'personal'`. This test expectation is incorrect.

**BEFORE:** The test assertion for `category` will fail once the `catego` bug is fixed, because the code would correctly pass `category: 'work'` not `'personal'`.

**AFTER:** The test expectation should be `category: 'work'` to match the input.

**Severity:** MEDIUM

**Status:** FIXED — Test now sends `category: 'personal'` (line 13) and expects `category: 'personal'` (line 27). Input and expectation now match. Also test now expects `priority: 'medium'` in the update call (line 26), which aligns with the route's default behavior.

---

## BUG 25 — No Express error handler middleware or 404 handler

**File:** `backend/src/index.js`

**Description:** The Express app has no error handler middleware. If any route throws an uncaught error, Express returns a generic HTML 500 response rather than a structured JSON error. There is also no 404 handler for unmatched routes.

**BEFORE:** Uncaught errors return generic HTML responses. Unmatched routes return Express default 404 HTML. API clients receive inconsistent error formats.

**AFTER:** Add an error handler middleware and a 404 handler that return JSON responses.

**Severity:** MEDIUM

**Status:** STILL EXISTS — Unchanged. No error middleware or 404 handler in index.js.

---

## BUG 26 — MySQL `storeItem` column/value count mismatch after partial fix (FIXED)

**File:** `backend/src/persistence/mysql.js:96-107`

**Description:** The `addItem` route constructs an item object with `id`, `name`, `completed`, `priority`, and `category`. `storeItem` in mysql.js now has 5 column names in the INSERT (`id, name, completed, priority, category`) but only 4 `?` placeholders in VALUES `VALUES (?, ?, ?, ?)`. The priority value is also missing from the parameter array `[item.id, item.name, item.completed ? 1 : 0, normalizeCategory(item.category)]`. This causes a SQL parameter count mismatch error (5 columns, 4 placeholders).

**BEFORE:** SQL error due to column/placeholder count mismatch. Priority is never persisted to MySQL.

**AFTER:** Add a 5th `?` placeholder and include `item.priority` in the VALUES array: `VALUES (?, ?, ?, ?, ?)` with `[item.id, item.name, item.completed ? 1 : 0, item.priority, normalizeCategory(item.category)]`.

**Severity:** HIGH

**Status:** FIXED — `mysql.js:102` — Now `VALUES (?, ?, ?, ?, ?)` with 5 values in param array including `item.priority`.

---

## BUG 27 — SQLite `storeItem` does not store priority despite addItem route providing it

**File:** `backend/src/persistence/sqlite.js:103-114`

**Description:** Same as Bug 26 but for SQLite. The `storeItem` function only inserts `(id, name, completed, category)`, discarding the `priority` field.

**BEFORE:** Priority is set in the route but never persisted to SQLite. Items always have no priority value in the database.

**AFTER:** Add a `priority` column to the SQLite table schema and include it in the INSERT statement.

**Severity:** HIGH

**Status:** FIXED — `sqlite.js:107-108` — `storeItem` now inserts `priority` column and value with 5 placeholders.

---

## BUG 28 — `onItemRemoval` produces corrupted state when item not found (FIXED)

**File:** `client/src/components/TodoListCard.jsx:36-42`

**Description:** If `findIndex` returns `-1` (item not found), `slice(-1 + 1)` = `slice(0)` which returns the full array, resulting in `setItems([...items.slice(0, -1), ...items.slice(0)])` which creates a corrupted array state with missing and duplicated items.

**BEFORE:** If an item ID is not found in the list, the state update produces unexpected/duplicate items.

**AFTER:** Check if `index === -1` before calling `setItems`, or use `items.filter(i => i.id !== item.id)`.

**Severity:** LOW

**Status:** FIXED — `TodoListCard.jsx:38-39` — Now uses correct slice pattern: `[...items.slice(0, index), ...items.slice(index + 1)]` which properly removes the item at the found index.

---

## BUG 29 — `onItemUpdate` has same slice bug when item not found (FIXED)

**File:** `client/src/components/TodoListCard.jsx:24-34`

**Description:** If `items.findIndex((i) => i.id === item.id)` returns `-1`, then `items.slice(0, -1)` returns all items except the last one, and `items.slice(0)` returns all items. The result is a corrupted state with missing and duplicated items.

**BEFORE:** If an update arrives for an item not in the current list, the state becomes corrupted.

**AFTER:** Check if `index === -1` before calling `setItems`, or use `items.map(i => i.id === item.id ? item : i)`.

**Severity:** LOW

**Status:** FIXED — `TodoListCard.jsx:26-31` — Now uses correct slice pattern: `[...items.slice(0, index), item, ...items.slice(index + 1)]` which properly replaces the item at the found index.

---

## BUG 30 — `addItem.spec.js` tests expect `priority` but persistence layers don't support it (FIXED)

**File:** `backend/spec/routes/addItem.spec.js:21-51`

**Description:** The tests for `addItem` expect items to be stored and returned with a `priority` field. However, neither the MySQL nor SQLite persistence layers have a `priority` column or store the priority field. These tests pass only because the persistence module is mocked — in reality, the priority would be lost.

**BEFORE:** Tests pass in isolation (due to mocks) but the actual system does not store priority. This gives a false sense of correctness.

**AFTER:** Either add priority support to both persistence layers (fixing Bugs 5 and 6), or update the tests to not expect priority.

**Severity:** MEDIUM

**Status:** FIXED — Both MySQL and SQLite persistence layers now store and return `priority`. Tests pass with mocks and actual behavior matches expectations.

---

## BUG 31 — ESLint config specifies React version 18.2 but package.json uses React 19.1

**File:** `client/.eslintrc.cjs:12`

**Description:** The ESLint settings specify `react: { version: '18.2' }` but `package.json` declares `"react": "^19.1.0"`. This version mismatch can cause ESLint rules to behave incorrectly, especially rules that depend on React version-specific behavior.

**BEFORE:** ESLint may apply rules intended for React 18.2 to React 19.1 code, potentially missing issues or reporting false positives.

**AFTER:** Update the ESLint config to match: `react: { version: 'detect' }` or explicitly set `'19.1'`.

**Severity:** LOW

**Status:** STILL EXISTS — Unchanged. ESLint still says `18.2`, package.json still `^19.1.0`.

---

## NEW BUG A — MySQL `priority` column has no data type (SQL syntax error)

**File:** `backend/src/persistence/mysql.js:47`

**Description:** The CREATE TABLE statement includes `priority,` as a column name but without any data type definition. It should be `priority VARCHAR(20)` or similar. This causes a SQL syntax error when the table is created, preventing the entire MySQL schema from initializing.

**BEFORE:** MySQL table creation fails with a syntax error. The application cannot start when using MySQL persistence.

**AFTER:** Define the priority column with a proper data type: `priority VARCHAR(20) DEFAULT 'medium'`

**Severity:** CRITICAL

**Status:** FIXED — `mysql.js:47` — `priority VARCHAR(20)` now has proper data type.

---

## NEW BUG B — MySQL `storeItem` INSERT has 5 columns but only 4 placeholders (FIXED)

**File:** `backend/src/persistence/mysql.js:100`

**Description:** The INSERT statement has 5 column names `(id, name, completed, priority, category)` but only 4 `?` placeholders in `VALUES (?, ?, ?, ?)`. This is a direct consequence of the partial fix for BUG 5/26 — the column name was added but the placeholder was not. This causes a SQL parameter count mismatch error.

**BEFORE:** Any attempt to store an item via MySQL throws a SQL error. No items can be created when using MySQL persistence.

**AFTER:** Add a 5th `?` placeholder: `VALUES (?, ?, ?, ?, ?)` and include the priority value in the parameter array.

**Severity:** CRITICAL

**Status:** FIXED — `mysql.js:102` — Now `VALUES (?, ?, ?, ?, ?)` with 5 values.

---

## NEW BUG C — SQLite `updateItem` parameter order mismatch (swapped category/completed) (FIXED)

**File:** `backend/src/persistence/sqlite.js:119-120`

**Description:** The SQL is `SET name=?, category=?, completed=?` (3 placeholders) but params are `[item.name, item.completed ? 1 : 0, normalizeCategory(item.category), id]` (4 values). Even ignoring the extra `id`, the order is wrong: `completed` value goes into `category` placeholder and `category` value goes into `completed` placeholder. Toggling completion corrupts the category and vice versa.

**BEFORE:** Completing a todo item changes its category instead. Changing category toggles its completion state. Data is silently corrupted.

**AFTER:** Match parameter order to SQL placeholder order: `[item.name, normalizeCategory(item.category), item.completed ? 1 : 0, id]`

**Severity:** HIGH

**Status:** FIXED — `sqlite.js:120-121` — Parameter order now matches SQL placeholder order.

---

## NEW BUG D — SQLite CREATE TABLE missing comma between `priority` and `completed` columns

**File:** `backend/src/persistence/sqlite.js:29-30`

**Description:** The CREATE TABLE SQL has `priority varchar(20)` on line 29 with no trailing comma, followed by `completed boolean,` on line 30. The missing comma causes a SQL syntax error when the table is created on a fresh database. This was introduced when the `priority` column was added to the schema.

**BEFORE:** SQLite database creation fails with a SQL syntax error. The app cannot start with a fresh SQLite database.

**AFTER:** Add a trailing comma after `priority varchar(20)` → `priority varchar(20),`

**Severity:** CRITICAL

**Status:** FIXED — `sqlite.js:29` now has trailing comma: `priority varchar(20),`

---

## NEW BUG E — SyntaxError in ItemDisplay removeItem: missing `.` before `then`

**File:** `client/src/components/ItemDisplay.jsx:43`

**Description:** The `removeItem` function has a syntax error: `fetch(`/api/items/${item.id}`, { method: 'DELETE' })then(r => {` — the `.` before `then` is missing. This causes a `SyntaxError` at parse time, preventing the entire `ItemDisplay.jsx` module from loading. This broke the entire app's ability to render todo items.

**BEFORE:** App crashes on load with `SyntaxError` when parsing ItemDisplay.jsx. No todo items can be displayed, toggled, or removed.

**AFTER:** Add the missing `.` before `then`: `fetch(`/api/items/${item.id}`, { method: 'DELETE' }).then(r => {`

**Severity:** CRITICAL

**Status:** NEW BUG — Introduced during partial fix of BUG 11

---

## Summary by Severity (UPDATED)

**Bugs FIXED:** 21 (BUG 2, 3, 4, 5, 6, 7, 8, 9, 10, 19, 20, 24, 26, 27, 28, 29, 30, NEW BUG A, B, C, D)
**Bugs PARTIALLY FIXED:** 1 (BUG 18 — priority in POST body but no UI selector)
**Bugs REGRESSED:** 1 (BUG 11 — error handling added but introduced syntax error)
**Bugs STILL EXISTING:** 12 (BUG 1, 12-17, 21-23, 25, 31)
**NEW BUGS FOUND:** 1 (E — syntax error from BUG 11 fix attempt)

| Severity | Count | Bug Numbers |
|----------|-------|-------------|
| CRITICAL | 3     | 1, 11, E |
| HIGH     | 2     | 14, 17 |
| MEDIUM   | 7     | 13, 15, 16, 18, 25, 30, 12 |
| LOW      | 4     | 21, 22, 23, 31 |
