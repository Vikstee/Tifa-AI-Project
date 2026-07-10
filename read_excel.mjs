import * as XLSX from 'xlsx';
import fs from 'fs';

try {
  const workbook = XLSX.readFile('Analisis_Prompt_Output_AI_Assistant.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log("Sheet Name:", sheetName);
  console.log("Total Rows:", data.length);
  console.log("Headers:");
  console.log(data[0]);
  console.log("First 3 Data Rows:");
  console.log(data.slice(1, 4));
} catch (e) {
  console.error("Error reading excel file:", e);
}
