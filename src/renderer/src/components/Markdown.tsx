import { useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

function textOf(n: ReactNode): string {
  if (typeof n === 'string') return n
  if (Array.isArray(n)) return n.map(textOf).join('')
  if (n && typeof n === 'object' && 'props' in n) return textOf((n as any).props.children)
  return ''
}

function Pre({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(textOf(children).replace(/\n$/, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <div className="relative group my-2">
      <button onClick={copy} className="btn absolute right-1 top-1 opacity-0 group-hover:opacity-100">
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="overflow-x-auto rounded-lg bg-black/60 p-3 text-xs">{children}</pre>
    </div>
  )
}

export default function Markdown({ text }: { text: string }) {
  return (
    <div className="md text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ pre: Pre as any }}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
