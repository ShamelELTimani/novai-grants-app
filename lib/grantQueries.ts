// grantQueries.ts is a helper file.
//
//It builds SQL filters.
//It builds sorting rules.
//It converts database rows into frontend-friendly grant objects.
export type GrantFilters = {
  search?: string | null;
  sector?: string | null;
  country?: string | null;
  showExpired?: boolean;
};

export function buildGrantWhere(filters: GrantFilters) {      // builds the SQL WHERE
  const whereParts: string[] = [];
  const params: unknown[] = [];

  // When the user types something in the search box, this code creates a SQL condition to search both the grant title and donor, then stores the search value safely in params
  const search = filters.search?.trim();          // get the search box
  if (search) {
    whereParts.push("(LOWER(g.title) LIKE ? OR LOWER(g.donor) LIKE ?)");          // search in MySQL
    const term = `%${search.toLowerCase()}%`;
    params.push(term, term);
  }

  // when the user searches by sector
  const sector = filters.sector?.trim();
  if (sector) {
    whereParts.push("g.sector = ?");
    params.push(sector);
  }

  // shows eligible country when the user searches a country
  const country = filters.country?.trim();
  if (country) {
    whereParts.push(`EXISTS (
      SELECT 1
      FROM grant_countries gc_filter
      JOIN countries c_filter ON c_filter.id = gc_filter.country_id
      WHERE gc_filter.grant_id = g.id AND c_filter.name = ?
    )`);
    params.push(country);
  }

  // hides expired grants by default
  if (!filters.showExpired) {
    // Requirement: open = deadline in the future OR no deadline.
    // Therefore a deadline equal to today is treated as expired.
    whereParts.push("(g.deadline IS NULL OR g.deadline > CURDATE())");
  }

  return {
    whereSql: whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "",
    params
  };
}

// validate the page number
export function normalizePage(value: string | null) {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

// pageSize = grants, shows how many grants per page
export function normalizePageSize(value: string | null) {
  const parsed = Number(value ?? 12);
  if (!Number.isInteger(parsed) || parsed < 1) return 12;
  return Math.min(parsed, 50);
}

// checks the sort value
export function normalizeSort(value: string | null) {
  return value === "deadline_desc" ? "deadline_desc" : "deadline_asc";
}

// creates the SQL sorting part
export function deadlineOrderSql(sort: string) {
  const direction = sort === "deadline_desc" ? "DESC" : "ASC";
  // Null deadlines are always last because they are open-ended, not urgent.
  return `(g.deadline IS NULL) ASC, g.deadline ${direction}, g.title ASC`;
}

// prepares data to the front-end
export function rowToGrant(row: Record<string, any>) {
  return {
    id: row.id,
    title: row.title,
    donor: row.donor,
    donorType: row.donor_type,
    sector: row.sector,
    eligibleCountries: row.eligible_countries ? String(row.eligible_countries).split(",") : [],
    minAmountUsd: Number(row.min_amount_usd),
    maxAmountUsd: Number(row.max_amount_usd),
    durationMonths: Number(row.duration_months),
    deadline: row.deadline,
    description: row.description,
    isExpired: Boolean(Number(row.is_expired)),
    applicationCount: Number(row.application_count ?? 0)
  };
}
