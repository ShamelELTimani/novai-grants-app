# NOVAI Grants App

A small full-stack app for NOVAI where NGOs can browse grant opportunities and submit applications.

The app includes:

* MySQL database schema
* Seed script for importing JSON data
* Backend API routes
* React / Next.js frontend
* Grant search, filtering, sorting, pagination
* Application submission with validation

---

## 1. Tech Stack

* Next.js
* React
* TypeScript
* MySQL
* mysql2

---

## 2. How to Run the Project

### Step 1: Install dependencies

Open the project folder in the terminal and run:

```bash
npm install
```

---

### Step 2: Create the MySQL database

Open MySQL Workbench and run:

```sql
CREATE DATABASE novai_grants;
USE novai_grants;
```

---

### Step 3: Run the schema

Open this file:

```txt
db/schema.sql
```

Run it in MySQL Workbench.

This creates the tables:

```txt
grants
countries
grant_countries
applications
```

---

### Step 4: Configure the MySQL connection

The MySQL connection is configured directly in:

```txt
lib/db.ts
scripts/seed.ts
```

Current local settings:

```txt
host: localhost
port: 3306
user: root
password: password
database: novai_grants
```

If your MySQL password is different, update it in both files before running the app.

---

### Step 5: Seed the database

Run:

```bash
npm run db:seed
```

This loads:

```txt
data/grants.json
data/applications.json
```

into the MySQL database.

---

### Step 6: Start the app

Run:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

or:

```txt
http://localhost:3000/grants
```

---

## 3. Database Schema Design

The database uses four main tables:

### grants

Stores grant opportunities.

Important fields:

```txt
id
title
donor
donor_type
sector
min_amount_usd
max_amount_usd
duration_months
deadline
description
```

### applications

Stores NGO applications submitted to grants.

Important fields:

```txt
id
grant_id
org_name
org_email
requested_amount_usd
status
submitted_at
```

### countries

Stores country names once.

This avoids repeating country names as plain text many times.

### grant_countries

This is a junction table between grants and countries.

It exists because one grant can be eligible for many countries, and one country can belong to many grants.

The primary key is:

```sql
PRIMARY KEY (grant_id, country_id)
```

This prevents the same grant-country pair from being inserted twice.

---

## 4. Why the Schema Was Designed This Way

The original `grants.json` file stores eligible countries as an array.

Instead of storing the array directly in the `grants` table, I normalized it into:

```txt
countries
grant_countries
```

This makes country filtering better and more scalable.

For example, when the user filters by Lebanon, the API can search using SQL joins instead of loading all grants into the browser.

The `applications` table references `grants` using:

```sql
FOREIGN KEY (grant_id) REFERENCES grants(id)
```

This keeps applications connected to valid grants.

---

## 5. Backend API

### GET /api/grants

Returns the grants list.

Supports:

* search by title or donor
* filter by sector
* filter by eligible country
* show expired toggle
* sort by deadline
* pagination
* application count for each grant

Search, filtering, sorting, and pagination are done in the API/database layer, not in the browser.

---

### GET /api/grants/:id

Returns one grant in detail.

Includes:

* full grant information
* eligible countries
* applications for that grant

---

### POST /api/applications

Submits a new application.

Validations:

* organization name is required
* organization email is required and must be valid
* requested amount must be positive
* requested amount must be within the grant funding range
* expired grants cannot receive applications
* same organization email cannot apply twice to the same grant

---

### GET /api/filters

Returns sector and country lists for the frontend dropdown filters.

---

## 6. Where the "Cannot Apply Twice" Rule Is Enforced

The rule is enforced in the database using a unique constraint:

```sql
UNIQUE KEY uq_applications_grant_email (grant_id, org_email)
```

This means the same email cannot apply twice to the same grant.

It is enforced in the database because this is safer than checking only in the frontend or API.

If two requests arrive at the same time, the database still prevents duplicates.

The API catches the MySQL duplicate error:

```txt
ER_DUP_ENTRY
```

and returns:

```txt
409 Conflict
```

with the message:

```txt
This organization has already applied to this grant.
```

---

## 7. Where Grants With No Deadline Sort

Grants with no deadline are placed last.

The sorting logic is:

```sql
ORDER BY (g.deadline IS NULL) ASC, g.deadline ASC
```

or:

```sql
ORDER BY (g.deadline IS NULL) ASC, g.deadline DESC
```

This means:

1. Grants with real deadlines appear first.
2. Grants with no deadline appear last.
3. The real deadlines are sorted either soonest first or latest first.

I placed no-deadline grants last because they are open-ended and less urgent than grants with a real deadline.

---

## 8. Frontend Pages

### /grants

The grants list page includes:

* search box
* sector filter
* country filter
* show expired checkbox
* deadline sorting
* pagination
* grant cards
* loading state
* empty state
* error state

Each grant card shows:

* title
* donor
* sector
* funding range
* deadline
* application count
* eligible countries
* open/expired status

---

### /grants/[id]

The grant detail page includes:

* full grant information
* eligible countries
* applications table
* apply form

The apply form shows API validation errors, such as:

* invalid email
* requested amount outside the funding range
* grant is expired
* organization already applied

---

## 9. Weakest Part of the Solution

The weakest part of the solution is that the project currently does not include user authentication or admin roles.

For example, any user can submit an application, and there is no login system for NGOs or NOVAI admins.

Also, the database connection is configured directly in the code for local setup. In a production version, I would use environment variables instead of hardcoded database credentials.

---

## 10. What I Would Improve With One More Week

With one more week, I would improve the project by adding:

* user authentication for NGOs
* admin dashboard for reviewing applications
* environment-based database configuration
* automated API tests
* better full-text search using MySQL `MATCH ... AGAINST`
* stronger frontend form validation
* deployment setup
* better UI polish and mobile testing

---

## 11. Notes

The app was designed so that filtering, searching, sorting, and pagination happen in the API/database layer.

This is important because loading all grants into the browser might work with 1,500 rows, but it would not scale well with 150,000 rows.
