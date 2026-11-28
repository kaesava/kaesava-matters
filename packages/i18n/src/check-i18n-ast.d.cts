export interface HardcodedStringIssue {
  file: string;
  line: number;
  message: string;
}

export function scanHardcodedClientStrings(
  filePath: string,
  content: string,
): HardcodedStringIssue[];
