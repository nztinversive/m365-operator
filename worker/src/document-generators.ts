// Re-export from main app document generators
// This file would ideally import from a shared library
// For now, we'll duplicate the essential types and implementations

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } from "docx";
import * as ExcelJS from "exceljs";
import pptxgen from "pptxgenjs";

// Word document generation
export interface WordDocumentSection {
  type: "heading" | "paragraph" | "list" | "table";
  level?: HeadingLevel;
  content: string;
  items?: string[];
  tableData?: { headers: string[]; rows: string[][] };
}

export async function generateWordDocument(
  title: string,
  sections: WordDocumentSection[]
): Promise<Buffer> {
  const children = [
    // Title
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({}), // Empty line
  ];

  for (const section of sections) {
    if (section.type === "heading") {
      children.push(
        new Paragraph({
          text: section.content,
          heading: section.level || HeadingLevel.HEADING_1,
        })
      );
    } else if (section.type === "paragraph") {
      children.push(
        new Paragraph({
          children: [new TextRun(section.content)],
        })
      );
    } else if (section.type === "list" && section.items) {
      for (const item of section.items) {
        children.push(
          new Paragraph({
            text: `• ${item}`,
            bullet: {
              level: 0,
            },
          })
        );
      }
    } else if (section.type === "table" && section.tableData) {
      const table = new Table({
        columnWidths: section.tableData.headers.map(() => 2000),
        rows: [
          new TableRow({
            children: section.tableData.headers.map(
              (header) =>
                new TableCell({
                  children: [new Paragraph({ text: header })],
                })
            ),
          }),
          ...section.tableData.rows.map(
            (row) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [new Paragraph({ text: cell })],
                    })
                ),
              })
          ),
        ],
      });
      children.push(table);
    }

    // Add spacing between sections
    children.push(new Paragraph({}));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// Excel workbook generation
export interface ExcelWorksheetData {
  name: string;
  headers: string[];
  rows: (string | number | boolean | Date)[][];
  formatting?: {
    headerRow?: boolean;
    autoWidth?: boolean;
  };
}

export async function generateExcelWorkbook(
  worksheets: ExcelWorksheetData[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const sheetData of worksheets) {
    const worksheet = workbook.addWorksheet(sheetData.name);

    // Add headers
    worksheet.addRow(sheetData.headers);

    // Add rows
    for (const row of sheetData.rows) {
      worksheet.addRow(row);
    }

    // Apply formatting
    if (sheetData.formatting?.headerRow !== false) {
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
    }

    if (sheetData.formatting?.autoWidth !== false) {
      worksheet.columns.forEach((column) => {
        const maxLength = Math.max(
          column.header?.toString().length || 0,
          ...sheetData.rows.map((row) => {
            const cellIndex = worksheet.columns.indexOf(column);
            const cellValue = row[cellIndex];
            return cellValue?.toString().length || 0;
          })
        );
        column.width = Math.max(10, maxLength + 2);
      });
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// PowerPoint presentation generation
export interface PowerPointSlide {
  title: string;
  content?: string;
  bullets?: string[];
  type?: "title" | "content" | "bullets" | "image";
}

export async function generatePowerPointPresentation(
  title: string,
  slides: PowerPointSlide[]
): Promise<Buffer> {
  const pres = new pptxgen();

  // Title slide
  const titleSlide = pres.addSlide();
  titleSlide.addText(title, {
    x: 1,
    y: 2.5,
    w: 8,
    h: 1.5,
    fontSize: 36,
    bold: true,
    color: "363636",
    align: "center",
  });
  titleSlide.addText(new Date().toLocaleDateString(), {
    x: 1,
    y: 4.5,
    w: 8,
    h: 0.5,
    fontSize: 16,
    color: "666666",
    align: "center",
  });

  // Content slides
  for (const slideData of slides) {
    const slide = pres.addSlide();

    // Slide title
    slide.addText(slideData.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: "363636",
    });

    if (slideData.bullets) {
      // Bullet points
      slide.addText(
        slideData.bullets.map((bullet) => ({ text: bullet, options: {} })),
        {
          x: 0.5,
          y: 1.5,
          w: 9,
          h: 5,
          fontSize: 18,
          bullet: { type: "bullet" },
          color: "363636",
        }
      );
    } else if (slideData.content) {
      // Regular content
      slide.addText(slideData.content, {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 5,
        fontSize: 18,
        color: "363636",
      });
    }
  }

  return Buffer.from(await pres.writeFile({ outputType: "arraybuffer" }) as ArrayBuffer);
}