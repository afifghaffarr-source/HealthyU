import ReactMarkdown, { type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/**
 * Markdown renderer dengan sanitasi HTML wajib.
 * Gunakan ini untuk semua konten markdown yang berasal dari user / AI / DB.
 */
export function SafeMarkdown({
  children,
  remarkPlugins,
  rehypePlugins,
  ...rest
}: Options) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]}
      rehypePlugins={[rehypeSanitize, ...(rehypePlugins ?? [])]}
      {...rest}
    >
      {children}
    </ReactMarkdown>
  );
}

export default SafeMarkdown;