import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  buildGrantWhere,
  deadlineOrderSql,
  normalizePage,
  normalizePageSize,
  normalizeSort,
  rowToGrant
} from "@/lib/grantQueries";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = normalizePage(searchParams.get("page"));
    const pageSize = normalizePageSize(searchParams.get("pageSize"));
    const sort = normalizeSort(searchParams.get("sort"));
    const showExpired = ["1", "true", "yes"].includes((searchParams.get("showExpired") ?? "").toLowerCase());

    const { whereSql, params } = buildGrantWhere({
      search: searchParams.get("search"),
      sector: searchParams.get("sector"),
      country: searchParams.get("country"),
      showExpired
    });

    const offset = (page - 1) * pageSize;
    const pool = getPool();

    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total FROM grants g ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.total ?? 0);

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        g.id,
        g.title,
        g.donor,
        g.donor_type,
        g.sector,
        g.min_amount_usd,
        g.max_amount_usd,
        g.duration_months,
        g.deadline,
        g.description,
        (g.deadline IS NOT NULL AND g.deadline <= CURDATE()) AS is_expired,
        COUNT(DISTINCT a.id) AS application_count,
        GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ',') AS eligible_countries
      FROM grants g
      LEFT JOIN applications a ON a.grant_id = g.id
      LEFT JOIN grant_countries gc ON gc.grant_id = g.id
      LEFT JOIN countries c ON c.id = gc.country_id
      ${whereSql}
      GROUP BY g.id
      ORDER BY ${deadlineOrderSql(sort)}
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      data: rows.map(rowToGrant).map(({ description, ...grant }) => grant),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        sort,
        showExpired,
        noDeadlinePosition: "last"
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load grants." }, { status: 500 });
  }
}
