export const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
};

export const toCsv = (rows, columns) => {
  const cols = columns && columns.length
    ? columns
    : (rows[0] ? Object.keys(rows[0]).map((k) => ({ key: k, header: k })) : []);

  const headerLine = cols.map((c) => csvEscape(c.header ?? c.key)).join(",");
  const bodyLines = rows.map((row) =>
    cols.map((c) => csvEscape(row?.[c.key])).join(",")
  );

  return [headerLine, ...bodyLines].join("\r\n");
};

export const downloadCsv = (filename, csvText) => {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
