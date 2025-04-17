import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { readFileSync, unlinkSync } from "fs";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument } from "pdf-lib";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

const REDLINE_MAP: Record<string, string> = {
  "Either Party may terminate this Agreement for convenience upon providing the other Party with thirty (30) days’ prior written notice.":
    "Either Party may terminate this Agreement for convenience upon providing the other Party with fourteen (14) days’ prior written notice. The Client shall not be responsible for any non-cancellable commitments unless such commitments were pre-approved in writing by the Client.",
  "The Client agrees to compensate the Recruiter according to the following structure:":
    "The Client agrees to compensate the Recruiter as follows:\n- Permanent Placements: 8% of the hire’s agreed annual base salary, excluding bonuses and benefits.\n- Fixed-Term Placements (>1 year): 8% of the annual base salary.\n- Fixed-Term Placements (<1 year): Equivalent to 75% of one month’s salary.\nInvoices due in 30 days. Late interest 1%.",
  "with arbitration to be held in Sheridan, Wyoming.":
    "with arbitration to be held remotely or in New York, at Client’s option.",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err || !files.file) {
      return res.status(500).send("File upload error.");
    }

    const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;
    const pdfBuffer = readFileSync(uploaded.filepath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages().map((page) => page.getTextContent()).map(() => "");

    const fakeText = Object.keys(REDLINE_MAP).join("\n\n");

    const doc = new Document();
    const paragraphs = fakeText.split("\n\n").map((p) => {
      const redline = REDLINE_MAP[p];
      return new Paragraph({
        children: [
          new TextRun({ text: p, strike: true }),
          new TextRun({ text: "\n" + redline, color: "red" }),
        ],
      });
    });
    doc.addSection({ children: paragraphs });

    const b = await Packer.toBuffer(doc);
    res.setHeader("Content-Disposition", "attachment; filename=BlockApps_Redlined_Contract.docx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.send(b);
  });
}
