import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { rowToGrant } from "@/lib/grantQueries";

export async function GET(_request: NextRequest, context: any) {
  try {
    const { id } = await context.params;
    const pool = getPool();

    const [grantRows] = await pool.query<any[]>(
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
      WHERE g.id = ?
      GROUP BY g.id
      `,
      [id]
    );

    if (!grantRows.length) {
      return NextResponse.json({ error: "Grant not found." }, { status: 404 });
    }

    const [applicationRows] = await pool.query<any[]>(
      `
      SELECT id, grant_id, org_name, org_email, requested_amount_usd, status, submitted_at
      FROM applications
      WHERE grant_id = ?
      ORDER BY submitted_at DESC, id DESC
      `,
      [id]
    );

    const grant = rowToGrant(grantRows[0]);

    return NextResponse.json({
      data: {
        ...grant,
        applications: applicationRows.map((row) => ({
          id: row.id,
          grantId: row.grant_id,
          orgName: row.org_name,
          orgEmail: row.org_email,
          requestedAmountUsd: Number(row.requested_amount_usd),
          status: row.status,
          submittedAt: row.submitted_at
        }))
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load grant." }, { status: 500 });
  }
}
