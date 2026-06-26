/** Validate uploaded file content by magic bytes / structure.
 *  Returns the safe MIME type or null if invalid.
 */
export function validateFileContent(buffer: Buffer, claimedExt: string): { valid: boolean; mimeType: string } {
  // XLSX is a ZIP file (PK header)
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
  // XLS is an OLE compound document
  const isOle = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
  // CSV: no magic bytes, but must be mostly printable text
  const printableRatio = buffer.slice(0, 1024).filter((b: number) => b >= 0x20 && b < 0x7F).length / Math.min(buffer.length, 1024);
  const isText = printableRatio > 0.8;

  switch (claimedExt) {
    case "xlsx":
      return { valid: isZip, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    case "xls":
      return { valid: isOle, mimeType: "application/vnd.ms-excel" };
    case "csv":
      return { valid: isText, mimeType: "text/csv" };
    default:
      return { valid: false, mimeType: "application/octet-stream" };
  }
}
