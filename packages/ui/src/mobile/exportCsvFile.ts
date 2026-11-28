import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export interface ExportCsvFileOptions {
  filename: string;
  csvContent: string;
  dialogTitle?: string;
}

/**
 * Writes a CSV string to the device cache directory and opens the native share sheet.
 * Returns true if sharing was invoked, false if sharing is unavailable or failed.
 */
export async function exportCsvFile({
  filename,
  csvContent,
  dialogTitle,
}: ExportCsvFileOptions): Promise<boolean> {
  const safeName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) return false;

  const fileUri = `${baseDir}${safeName}`;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: "text/csv",
    dialogTitle,
  });
  return true;
}
