import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { splitBlocks } from "@/lib/exoChat";

// Links (e.g. Exo's news sources) open in a new tab and don't trigger bubble gestures.
const mdComponents: Components = {
  a: ({ node: _node, href, children, ...rest }) => (
    <a {...rest} href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
      {children}
    </a>
  ),
};

export default function ExoMarkdown({ content }: { content: string }) {
  return (
    <div className="exo-md space-y-2 text-[15px] leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-0 [&_p+p]:mt-2 [&_a]:text-accent [&_a]:underline [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:text-[13px] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-accent/60 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
      {splitBlocks(content).map((b, i) =>
        b.kind === "md" ? (
          <ReactMarkdown key={i} components={mdComponents}>{b.text}</ReactMarkdown>
        ) : (
          <div key={i} className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full text-[13px] tabular-nums">
              <thead className="bg-background/50">
                <tr>
                  {b.header.map((h, j) => (
                    <th key={j} scope="col" className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      <ReactMarkdown allowedElements={["strong", "em", "code"]} unwrapDisallowed>{h}</ReactMarkdown>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, k) => (
                  <tr key={k} className="border-t border-border/60">
                    {r.map((c, j) => (
                      <td key={j} className="px-3 py-1.5 whitespace-nowrap">
                        <ReactMarkdown allowedElements={["strong", "em", "code"]} unwrapDisallowed>{c}</ReactMarkdown>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}
