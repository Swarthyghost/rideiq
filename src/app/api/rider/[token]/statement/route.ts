import { NextResponse } from "next/server";
import { checkRiderPin, findBikeByRiderToken } from "@/lib/firebase/bikes-admin";
import { pinFailureResponse } from "@/lib/rider-access";
import { buildStatementPdf } from "@/lib/rider-statement";
import { buildRiderView } from "@/lib/rider-view";
import { buildStatementData, statementFileName } from "@/lib/statement-data";

/**
 * The PIN is asked for again here on purpose: opening the page isn't enough to
 * get a statement. Wrong tries count towards the same 5-try lockout as the page.
 *
 * One reply carries both the figures for the on-screen view and the PDF for
 * download, so a single PIN check covers both.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));
  const pin = String(body.pin ?? "").slice(0, 12);

  const result = await checkRiderPin(token, pin);
  if (!result.ok) return pinFailureResponse(result);

  const bike = await findBikeByRiderToken(token);
  if (!bike) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });

  const now = new Date();
  const statement = buildStatementData(buildRiderView(bike), now);
  const pdf = await buildStatementPdf(statement, now);

  return NextResponse.json(
    {
      statement,
      pdf: { filename: statementFileName(statement), base64: Buffer.from(pdf).toString("base64") },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
