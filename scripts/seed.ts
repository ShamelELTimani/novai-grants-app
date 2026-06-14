import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";

type GrantJson = {
  id: string;
  title: string;
  donor: string;
  donor_type: string;
  sector: string;
  eligible_countries: string[];
  min_amount_usd: number;
  max_amount_usd: number;
  duration_months: number;
  deadline: string | null;
  description: string;
};

type ApplicationJson = {
  id: string;
  grant_id: string;
  org_name: string;
  org_email: string;
  requested_amount_usd: number;
  status: "submitted" | "in_review" | "approved" | "rejected";
  submitted_at: string;
};

const root = process.cwd();

async function readJson<T>(relativePath: string): Promise<T> {            // receives the path/location of a file
  const raw = await fs.readFile(path.join(root, relativePath), "utf8");     // reads the file as strings and store them in raw
  return JSON.parse(raw) as T;          // changes string to usable js data
}

async function main() {
  const host = "localhost";
  const port = 3306;
  const user = "root";
  const password = "password";

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true        // allow the script to run multiple statements at once
  });

  const schema = await fs.readFile(path.join(root, "db", "schema.sql"), "utf8");
  await connection.query(schema);         // executes the whole schema.sql file in MySQL
  await connection.query("USE novai_grants");       // tells MySQL to use the database novai_grants

  const grants = await readJson<GrantJson[]>("data/grants.json");
  const applications = await readJson<ApplicationJson[]>("data/applications.json");

  console.log(`Loading ${grants.length} grants and ${applications.length} applications...`);      // prints a message in the terminal to help us know the script is working run: npm run db:seed

  await connection.query(
    `
    INSERT INTO grants
      (id, title, donor, donor_type, sector, min_amount_usd, max_amount_usd, duration_months, deadline, description)      
    VALUES ?
    `,
    [
      grants.map((grant) => [
        grant.id,
        grant.title,
        grant.donor,
        grant.donor_type,
        grant.sector,
        grant.min_amount_usd,
        grant.max_amount_usd,
        grant.duration_months,
        grant.deadline,
        grant.description
      ])
    ]
  );

  const countryNames = Array.from(new Set(grants.flatMap((grant) => grant.eligible_countries))).sort();       // get all eligible countries and removes duplicates
  await connection.query("INSERT INTO countries (name) VALUES ?", [countryNames.map((name) => [name])]);

  const [countryRows] = await connection.query<any[]>("SELECT id, name FROM countries");
  const countryIdByName = new Map(countryRows.map((row) => [row.name, row.id]));

  const grantCountryRows = grants.flatMap((grant) =>
    grant.eligible_countries.map((country) => [grant.id, countryIdByName.get(country)])     // creates a pair grant_id and country_id
  );
  await connection.query("INSERT INTO grant_countries (grant_id, country_id) VALUES ?", [grantCountryRows]);      // insert data into grant_countries

  await connection.query(
    `
    INSERT INTO applications
      (id, grant_id, org_name, org_email, requested_amount_usd, status, submitted_at)
    VALUES ?
    `,
    [
      applications.map((application) => [
        application.id,
        application.grant_id,
        application.org_name,
        application.org_email.toLowerCase(),
        application.requested_amount_usd,
        application.status,
        application.submitted_at
      ])
    ]
  );

  await connection.end();
  console.log("Database seeded successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
