/* eslint-disable @typescript-eslint/no-explicit-any */

// Convert TipTap JSON to Markdown

function inlineContent(content: any[] | undefined): string {
  if (!content) return "";
  return content
    .map((node) => {
      if (node.type === "text") {
        let text = node.text || "";
        const marks = node.marks || [];
        for (const mark of marks) {
          if (mark.type === "bold") text = `**${text}**`;
          if (mark.type === "italic") text = `*${text}*`;
          if (mark.type === "underline") text = `__${text}__`;
        }
        return text;
      }
      if (node.type === "hardBreak") return "\n";
      return "";
    })
    .join("");
}

function nodeToMarkdown(node: any): string {
  if (!node) return "";

  switch (node.type) {
    case "doc":
      return (node.content || []).map(nodeToMarkdown).join("\n");

    case "heading": {
      const level = node.attrs?.level || 1;
      const prefix = "#".repeat(level);
      return `${prefix} ${inlineContent(node.content)}\n`;
    }

    case "paragraph":
      return `${inlineContent(node.content)}\n`;

    case "bulletList":
      return (node.content || [])
        .map((li: any) => {
          const inner = (li.content || [])
            .map((p: any) => inlineContent(p.content))
            .join("\n");
          return `- ${inner}`;
        })
        .join("\n") + "\n";

    case "orderedList":
      return (node.content || [])
        .map((li: any, i: number) => {
          const inner = (li.content || [])
            .map((p: any) => inlineContent(p.content))
            .join("\n");
          return `${i + 1}. ${inner}`;
        })
        .join("\n") + "\n";

    default:
      if (node.content) {
        return (node.content || []).map(nodeToMarkdown).join("");
      }
      return "";
  }
}

export function tiptapJsonToMarkdown(json: string): string {
  try {
    const doc = JSON.parse(json);
    return nodeToMarkdown(doc).trim() + "\n";
  } catch {
    return json;
  }
}

export function downloadFile(content: string, filename: string, mime = "text/markdown") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
