import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ApplicationPayload = {
  grantId?: string;
  orgName?: string;
  orgEmail?: string;
  requestedAmountUsd?: number | string;
};

function validationError(details: Record<string, string>, status = 400) {
  return NextResponse.json({ error: "Validation failed.", details }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ApplicationPayload;
    const grantId = body.grantId?.trim();
    const orgName = body.orgName?.trim();
    const orgEmail = body.orgEmail?.trim().toLowerCase();
    const requestedAmountUsd = Number(body.requestedAmountUsd);

    const errors: Record<string, string> = {};
    if (!grantId) errors.grantId = "Grant is required.";
    if (!orgName) errors.orgName = "Organization name is required.";
    if (!orgEmail || !emailRegex.test(orgEmail)) errors.orgEmail = "A valid organization email is required.";
    if (!Number.isInteger(requestedAmountUsd) || requestedAmountUsd <= 0) {
      errors.requestedAmountUsd = "Requested amount must be a positive whole number.";
    }

    if (Object.keys(errors).length) return validationError(errors);

    const pool = getPool();
    const [grantRows] = await pool.query<any[]>(
      `
      SELECT
        id,
        min_amount_usd,
        max_amount_usd,
        deadline,
        (deadline IS NOT NULL AND deadline <= CURDATE()) AS is_expired
      FROM grants
      WHERE id = ?
      `,
      [grantId]
    );

    if (!grantRows.length) {
      return NextResponse.json({ error: "Grant not found." }, { status: 404 });
    }

    const grant = grantRows[0];
    if (Number(grant.is_expired)) {
      return validationError({ grantId: "This grant is expired and no longer accepts applications." }, 422);
    }

    const min = Number(grant.min_amount_usd);
    const max = Number(grant.max_amount_usd);
    if (requestedAmountUsd < min || requestedAmountUsd > max) {
      return validationError(
        { requestedAmountUsd: `Requested amount must be between ${min} and ${max} USD.` },
        422
      );
    }

    const id = randomUUID();

    try {
      await pool.query(
        `
        INSERT INTO applications
          (id, grant_id, org_name, org_email, requested_amount_usd, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, 'submitted', CURDATE())
        `,
        [id, grantId, orgName, orgEmail, requestedAmountUsd]
      );
    } catch (error: any) {
      if (error?.code === "ER_DUP_ENTRY") {
        return NextResponse.json(
          { error: "This organization has already applied to this grant." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      {
        data: {
          id,
          grantId,
          orgName,
          orgEmail,
          requestedAmountUsd,
          status: "submitted",
          submittedAt: new Date().toISOString().slice(0, 10)
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
  }
}
