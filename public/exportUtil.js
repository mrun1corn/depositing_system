// Simple export utility leveraging SheetJS (XLSX) loaded globally
window.exportUtil = {
  exportJsonToXlsx(filename, sheetName, rows) {
    if (!Array.isArray(rows)) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
    XLSX.writeFile(wb, filename || 'export.xlsx');
  },
  exportJsonToCsv(filename, rows) {
    if (!Array.isArray(rows)) return;
    if (!rows.length) {
      const blob = new Blob([''], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename || 'export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    let csv = headers.join(',') + '\n';
    rows.forEach(r => {
      const line = headers.map(h => esc(r[h])).join(',');
      csv += line + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || 'export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  exportTableToCsv(filename, tableSelector) {
    const table = document.querySelector(tableSelector);
    if (!table) return;
    let csv = '';
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cols = row.querySelectorAll('th,td');
      const line = Array.from(cols).map(c => '"' + (c.innerText || '').replace(/"/g, '""') + '"').join(',');
      csv += line + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || 'export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
