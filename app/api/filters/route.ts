import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  try {
    const pool = getPool();
    const [sectorRows] = await pool.query<any[]>("SELECT DISTINCT sector FROM grants ORDER BY sector ASC");
    const [countryRows] = await pool.query<any[]>("SELECT name FROM countries ORDER BY name ASC");

    return NextResponse.json({
      data: {
        sectors: sectorRows.map((row) => row.sector),
        countries: countryRows.map((row) => row.name)
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load filters." }, { status: 500 });
  }
}
