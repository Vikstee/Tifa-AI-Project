const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('Analisis_Prompt_Output_AI_Assistant.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headers = data[3];
  const rows = data.slice(4).filter(row => row.length > 0 && row[0]);
  
  const mapped = rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });

  console.log(JSON.stringify(mapped, null, 2));
} catch (e) {
  console.error("Error reading excel file:", e);
}
