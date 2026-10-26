import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDateShort, formatGHS } from "@/lib/format";
import { RIDER_SUPPORT_WHATSAPP_DISPLAY } from "@/lib/rider-portal";
import { STATEMENT_STATUS_TEXT, type StatementData, type StatementRowStatus } from "@/lib/statement-data";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_SPACE = 64;
const ROW_H = 20;

const INK = rgb(0.11, 0.16, 0.14);
const MUTED = rgb(0.48, 0.46, 0.41);
const LINE = rgb(0.88, 0.86, 0.81);
const PANEL = rgb(0.96, 0.95, 0.92);
const BRAND = rgb(0.12, 0.3, 0.24);
const CREAM = rgb(0.96, 0.95, 0.92);
const GREEN = rgb(0.12, 0.42, 0.27);
const RED = rgb(0.64, 0.15, 0.12);
const BLUE = rgb(0.12, 0.31, 0.56);
const AMBER = rgb(0.7, 0.35, 0.03);

const COLUMNS = [
  { key: "week", label: "WEEK", w: 40, align: "left" },
  { key: "due", label: "DUE DATE", w: 85, align: "left" },
  { key: "amount", label: "AMOUNT", w: 75, align: "right" },
  { key: "status", label: "STATUS", w: 125, align: "left" },
  { key: "paidOn", label: "PAID ON", w: 85, align: "left" },
  { key: "toDate", label: "PAID TO DATE", w: 105, align: "right" },
] as const;

// Standard PDF fonts only cover Western characters, so anything else (for example
// the Twi letters in some names) is mapped to a close Latin letter, never dropped.
const LETTER_MAP: Record<string, string> = { "ɔ": "o", "Ɔ": "O", "ɛ": "e", "Ɛ": "E" };

function safe(font: PDFFont, text: string): string {
  let out = "";
  for (const raw of text.normalize("NFC")) {
    const ch = LETTER_MAP[raw] ?? raw;
    try {
      font.encodeText(ch);
      out += ch;
      continue;
    } catch {
      // fall through to the accent-stripped form
    }
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    try {
      font.encodeText(base);
      out += base;
    } catch {
      out += "?";
    }
  }
  return out;
}

function fit(font: PDFFont, size: number, text: string, maxWidth: number): string {
  const clean = safe(font, text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let cut = clean;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) cut = cut.slice(0, -1);
  return `${cut}...`;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

const STATUS_COLOR: Record<StatementRowStatus, ReturnType<typeof rgb>> = {
  paid: GREEN,
  "paid-late": GREEN,
  awaiting: BLUE,
  overdue: RED,
  due: AMBER,
};

function drawTableHeader(page: PDFPage, fonts: Fonts, y: number): number {
  page.drawRectangle({ x: MARGIN, y: y - ROW_H, width: CONTENT_W, height: ROW_H, color: PANEL });
  let x = MARGIN;
  for (const col of COLUMNS) {
    const pad = 6;
    const textW = fonts.bold.widthOfTextAtSize(col.label, 8);
    const tx = col.align === "right" ? x + col.w - pad - textW : x + pad;
    page.drawText(col.label, { x: tx, y: y - 13.5, size: 8, font: fonts.bold, color: MUTED });
    x += col.w;
  }
  return y - ROW_H;
}

function drawCell(page: PDFPage, font: PDFFont, text: string, colIndex: number, y: number, color = INK) {
  const col = COLUMNS[colIndex];
  let x = MARGIN;
  for (let i = 0; i < colIndex; i++) x += COLUMNS[i].w;
  const pad = 6;
  const fitted = fit(font, 9.5, text, col.w - pad * 2);
  const w = font.widthOfTextAtSize(fitted, 9.5);
  const tx = col.align === "right" ? x + col.w - pad - w : x + pad;
  page.drawText(fitted, { x: tx, y: y - 13.5, size: 9.5, font, color });
}

function statBox(page: PDFPage, fonts: Fonts, x: number, y: number, w: number, label: string, value: string) {
  page.drawRectangle({ x, y: y - 46, width: w, height: 46, color: PANEL });
  page.drawText(safe(fonts.regular, label), { x: x + 10, y: y - 16, size: 8.5, font: fonts.regular, color: MUTED });
  page.drawText(fit(fonts.bold, 13, value, w - 20), { x: x + 10, y: y - 34, size: 13, font: fonts.bold, color: INK });
}

/** Builds the PDF from the shared statement data, which is built from the sanitized rider view only. */
export async function buildStatementPdf(data: StatementData, now: Date): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const statementDate = formatDateShort(data.statementDate);

  doc.setTitle(`RiderIQ account statement - ${safe(fonts.regular, data.riderName)}`);
  doc.setAuthor("RiderIQ");
  doc.setCreator("RiderIQ");
  doc.setCreationDate(now);

  let page = doc.addPage([PAGE_W, PAGE_H]);

  // Header band
  page.drawRectangle({ x: 0, y: PAGE_H - 84, width: PAGE_W, height: 84, color: BRAND });
  page.drawText("RiderIQ", { x: MARGIN, y: PAGE_H - 42, size: 22, font: fonts.bold, color: CREAM });
  page.drawText("Work & Pay, Redefined.", { x: MARGIN, y: PAGE_H - 60, size: 9, font: fonts.regular, color: CREAM });
  const title = "ACCOUNT STATEMENT";
  page.drawText(title, {
    x: PAGE_W - MARGIN - fonts.bold.widthOfTextAtSize(title, 12),
    y: PAGE_H - 40,
    size: 12,
    font: fonts.bold,
    color: CREAM,
  });
  const dateLine = `Statement date: ${statementDate}`;
  page.drawText(dateLine, {
    x: PAGE_W - MARGIN - fonts.regular.widthOfTextAtSize(dateLine, 9.5),
    y: PAGE_H - 58,
    size: 9.5,
    font: fonts.regular,
    color: CREAM,
  });

  let y = PAGE_H - 84 - 30;

  // Rider block
  page.drawText(fit(fonts.bold, 17, data.riderName, CONTENT_W), { x: MARGIN, y, size: 17, font: fonts.bold, color: INK });
  y -= 18;
  const bikeLine = `${data.bikeModel}${data.plateNumber ? `  |  ${data.plateNumber}` : ""}`;
  page.drawText(fit(fonts.regular, 10.5, bikeLine, CONTENT_W), { x: MARGIN, y, size: 10.5, font: fonts.regular, color: MUTED });
  y -= 14;
  page.drawText(
    safe(
      fonts.regular,
      `Contract started ${formatDateShort(data.startDate)}  |  ${formatGHS(data.weeklyAmount)} a week  |  ${data.numPayments} weekly payments`
    ),
    { x: MARGIN, y, size: 10.5, font: fonts.regular, color: MUTED }
  );
  y -= 24;

  // Summary boxes
  const gap = 8;
  const boxW = (CONTENT_W - gap * 3) / 4;
  statBox(page, fonts, MARGIN, y, boxW, "Contract total", formatGHS(data.totalValue));
  statBox(page, fonts, MARGIN + (boxW + gap), y, boxW, "Paid so far", formatGHS(data.paidAmount));
  statBox(
    page,
    fonts,
    MARGIN + (boxW + gap) * 2,
    y,
    boxW,
    "Balance left",
    data.balance === null ? "Void" : formatGHS(data.balance)
  );
  statBox(
    page,
    fonts,
    MARGIN + (boxW + gap) * 3,
    y,
    boxW,
    "Payments made",
    `${data.paidCount} of ${data.numPayments}`
  );
  y -= 46 + 16;

  const used = data.lateUsed;
  page.drawText(safe(fonts.regular, `Late payments used: ${used} of ${data.lateAllowed}`), {
    x: MARGIN,
    y,
    size: 10,
    font: fonts.bold,
    color: used > 0 ? RED : GREEN,
  });
  y -= 16;

  if (data.awaitingAmount > 0) {
    page.drawText(
      safe(fonts.regular, `Awaiting the owner's confirmation: ${formatGHS(data.awaitingAmount)} (not counted as paid until confirmed)`),
      { x: MARGIN, y, size: 9.5, font: fonts.regular, color: BLUE }
    );
    y -= 16;
  }

  if (data.repossessed) {
    page.drawRectangle({ x: MARGIN, y: y - 30, width: CONTENT_W, height: 30, color: PANEL });
    page.drawText("Bike repossessed. This account is closed and the remaining balance is void.", {
      x: MARGIN + 10,
      y: y - 19,
      size: 9.5,
      font: fonts.bold,
      color: INK,
    });
    y -= 44;
  }

  y -= 8;
  page.drawText("Weekly payments", { x: MARGIN, y, size: 12, font: fonts.bold, color: INK });
  y -= 10;

  const shown = data.rows;

  y = drawTableHeader(page, fonts, y);

  if (shown.length === 0) {
    page.drawText(data.repossessed ? "No payments were made on this account." : "No payments have fallen due yet.", { x: MARGIN + 6, y: y - 15, size: 9.5, font: fonts.regular, color: MUTED });
    y -= ROW_H;
  }

  for (const row of shown) {
    if (y - ROW_H < FOOTER_SPACE) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = drawTableHeader(page, fonts, PAGE_H - MARGIN);
    }

    drawCell(page, fonts.bold, `${row.weekNumber}`, 0, y);
    drawCell(page, fonts.regular, formatDateShort(row.dueDate), 1, y);
    drawCell(page, fonts.regular, formatGHS(row.amountDue), 2, y);
    drawCell(page, fonts.bold, STATEMENT_STATUS_TEXT[row.status], 3, y, STATUS_COLOR[row.status]);
    drawCell(page, fonts.regular, row.paidDate ? formatDateShort(row.paidDate) : "-", 4, y);
    drawCell(page, fonts.regular, row.paidToDate !== null ? formatGHS(row.paidToDate) : "-", 5, y);
    page.drawLine({
      start: { x: MARGIN, y: y - ROW_H },
      end: { x: MARGIN + CONTENT_W, y: y - ROW_H },
      thickness: 0.5,
      color: LINE,
    });
    y -= ROW_H;
  }

  // Closing total, kept together with at least the notes below it.
  if (y - 80 < FOOTER_SPACE) {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }
  y -= 6;
  const totalLabel = "Total paid to date";
  const totalValue = formatGHS(data.paidAmount);
  page.drawText(totalLabel, { x: MARGIN + 6, y: y - 12, size: 10.5, font: fonts.bold, color: INK });
  page.drawText(totalValue, {
    x: MARGIN + CONTENT_W - 6 - fonts.bold.widthOfTextAtSize(totalValue, 10.5),
    y: y - 12,
    size: 10.5,
    font: fonts.bold,
    color: GREEN,
  });
  y -= 30;

  if (data.upcomingCount > 0) {
    page.drawText(
      safe(
        fonts.regular,
        `${data.upcomingCount} later payment${data.upcomingCount === 1 ? "" : "s"} (${formatGHS(data.upcomingAmount)} in total) not yet due and not shown.`
      ),
      { x: MARGIN, y, size: 9, font: fonts.regular, color: MUTED }
    );
    y -= 13;
  }
  page.drawText(
    "This statement lists payments confirmed by the owner. A payment you reported is shown as Awaiting confirmation.",
    { x: MARGIN, y, size: 8.5, font: fonts.regular, color: MUTED }
  );

  // Footer on every page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawLine({
      start: { x: MARGIN, y: 44 },
      end: { x: MARGIN + CONTENT_W, y: 44 },
      thickness: 0.5,
      color: LINE,
    });
    p.drawText(`Questions? WhatsApp RideIQ on ${RIDER_SUPPORT_WHATSAPP_DISPLAY}`, {
      x: MARGIN,
      y: 30,
      size: 8.5,
      font: fonts.regular,
      color: MUTED,
    });
    const pageText = `Page ${i + 1} of ${pages.length}`;
    p.drawText(pageText, {
      x: MARGIN + CONTENT_W - fonts.regular.widthOfTextAtSize(pageText, 8.5),
      y: 30,
      size: 8.5,
      font: fonts.regular,
      color: MUTED,
    });
  });

  return doc.save();
}
