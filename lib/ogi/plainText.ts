/**
 * The chat bubble shows Ogi's reply as plain text (it keeps line breaks). Models still slip into markdown now and
 * then, so every reply passes through here on the server before the reply check and before it leaves:
 * bold, italics, headings, code marks and links become plain words, and list markers become "• ".
 */
export function toPlainText(text: string): string {
  return (
    text
      .replace(/\r\n?/g, "\n")
      // Code fences and inline code: keep the words, drop the marks.
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/`([^`\n]+)`/g, "$1")
      // Links: [label](url) -> label. A bare url stays as it is.
      .replace(/\[([^\]\n]+)\]\((?:[^)\s]+)\)/g, "$1")
      // Bold and strong italics, with asterisks or underscores.
      .replace(/\*\*\*([^*\n]+)\*\*\*/g, "$1")
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      .replace(/(^|[^\w])__([^_\n]+)__(?=[^\w]|$)/g, "$1$2")
      // Headings at the start of a line.
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
      // Bullets at the start of a line: "* ", "- " or "+ " -> "• ". Numbered lists stay as they are.
      .replace(/^[ \t]*[*+-][ \t]+/gm, "• ")
      // Single-asterisk or underscore italics around words.
      .replace(/(^|[\s(])\*([^\s*][^*\n]*?)\*(?=[\s).,!?:;]|$)/g, "$1$2")
      .replace(/(^|[\s(])_([^\s_][^_\n]*?)_(?=[\s).,!?:;]|$)/g, "$1$2")
      // Any asterisk pair left over, then stray doubled asterisks.
      .replace(/\*\*/g, "")
      // Tidy blank lines.
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
