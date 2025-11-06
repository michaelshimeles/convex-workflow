import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import ReactMarkdown from 'react-markdown'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisDetail,
})

function AnalysisDetail() {
  const { id } = Route.useParams()
  const result = useQuery(api.helpers.getScrapeResultById, {
    id: id as Id<'siteAnalysis'>,
  })

  if (!result) {
    return (
      <main className="min-h-screen bg-white text-black font-mono">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="text-sm uppercase tracking-wide text-neutral-500">
            Loading...
          </div>
        </div>
      </main>
    )
  }

  let markdownContent = ''

  try {
    const parsedAnalysis = JSON.parse(result.analysis)

    // Handle array format: [{ text: "...", type: "text" }]
    if (Array.isArray(parsedAnalysis)) {
      markdownContent = parsedAnalysis
        .map(item => item.text || '')
        .join('\n\n')
    }
    // Handle object format: { text: "...", type: "text" }
    else if (parsedAnalysis.text) {
      markdownContent = parsedAnalysis.text
    }
    // Handle direct string
    else if (typeof parsedAnalysis === 'string') {
      markdownContent = parsedAnalysis
    }
    // Fallback to stringified JSON
    else {
      markdownContent = JSON.stringify(parsedAnalysis, null, 2)
    }
  } catch {
    // If parsing fails, use as-is
    markdownContent = result.analysis
  }

  return (
    <main className="min-h-screen bg-white text-black font-mono">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <Link
            to="/"
            className="text-xs uppercase tracking-wide text-neutral-500 hover:text-black transition"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight uppercase">
            Analysis
          </h1>
        </div>

        {/* Result Card */}
        <article className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
          {/* Header with URL */}
          <header className="flex flex-col gap-1 border-b border-neutral-200 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide break-all">
              {result.siteUrl}
            </h3>
            <p className="text-[10px] text-neutral-500 uppercase">
              Analyzed {new Date(result._creationTime).toLocaleString()}
            </p>
          </header>

          {/* Analysis Content */}
          <div className="px-5 py-4">
            <div className="prose prose-neutral prose-sm max-w-none font-mono leading-relaxed">
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </div>
          </div>
        </article>
      </div>
    </main>
  )
}
