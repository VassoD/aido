import { Fragment } from "react";

interface RichTextProps {
  text: string;
}

const BOLD_PATTERN = /\*\*(.+?)\*\*/g;
const LIST_ITEM_PATTERN = /^\s*[-*]\s+/;

function renderInline(line: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const match of line.matchAll(BOLD_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(line.slice(lastIndex, index));
    nodes.push(<strong key={index} className="font-semibold text-ink">{match[1]}</strong>);
    lastIndex = index + match[0].length;
  }
  if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
  return nodes;
}

/**
 * Renders the small subset of markdown the assistant is asked to use (paragraphs, bullet lists, bold)
 * without pulling in a markdown parser or rendering raw HTML.
 */
export function RichText({ text }: RichTextProps): React.ReactElement {
  const blocks = text.trim().split(/\n{2,}/);

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        if (lines.every((line) => LIST_ITEM_PATTERN.test(line))) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5 marker:text-sun">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(LIST_ITEM_PATTERN, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={blockIndex}>
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
