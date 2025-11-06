import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useState, useEffect } from 'react'
import { Trash } from 'lucide-react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [input, setInput] = useState('')
  const [activeWorkflowIds, setActiveWorkflowIds] = useState<Set<string>>(new Set())
  const kickoffWorkflow = useMutation(api.index.kickoffWorkflow)
  const scrapeResults = useQuery(api.helpers.getScrapeResult, {})
  const activeWorkflowIdsFromDb = useQuery(api.index.getActiveWorkflowIds, {})

  // Load active workflows on mount and when DB updates
  useEffect(() => {
    if (activeWorkflowIdsFromDb) {
      setActiveWorkflowIds(new Set(activeWorkflowIdsFromDb))
    }
  }, [activeWorkflowIdsFromDb])

  const handleAnalyze = async () => {
    if (!input) return
    try {
      const workflowId = await kickoffWorkflow({ siteUrl: input })
      setActiveWorkflowIds(prev => new Set(prev).add(workflowId))
      setInput('')
    } catch (error) {
      console.error('Failed to start workflow:', error)
    }
  }

  return (
    <main className="min-h-screen bg-white text-black font-mono">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight uppercase">Website Analyzer</h1>
            <p className="text-xs text-neutral-500 uppercase">Convex workflow experiment</p>
          </div>
          <Link
            to="/game"
            className="px-4 py-2 text-sm uppercase tracking-wider border border-black hover:bg-black hover:text-white transition"
          >
            Clicking game →
          </Link>
        </div>

        {/* Input Section */}
        <section className="border border-neutral-200 rounded-lg p-5 space-y-3 bg-white">
          <div className="space-y-1.5">
            <label htmlFor="url-input" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
              Website url
            </label>
            <input
              id="url-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              type="text"
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-neutral-300 rounded-sm bg-white text-sm tracking-tight focus:outline-none focus:border-black"
            />
          </div>
          <button
            disabled={!input}
            className={`w-full px-3 py-2 text-sm uppercase tracking-widest border border-black transition ${!input
              ? 'text-neutral-400 border-neutral-300 cursor-not-allowed'
              : 'bg-black text-white hover:bg-neutral-900'
              }`}
            type="submit"
            onClick={handleAnalyze}
          >
            Analyze
          </button>

          {activeWorkflowIds.size > 0 && (
            <div className="text-xs text-neutral-500 uppercase tracking-wide">
              {activeWorkflowIds.size} workflow{activeWorkflowIds.size !== 1 ? 's' : ''} running
            </div>
          )}
        </section>

        {/* Results Section */}
        {scrapeResults && scrapeResults.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold uppercase tracking-wide">Analysis</h2>
            {[...scrapeResults].reverse().map((result) => {
              // Show all results, including placeholders (empty analysis)
              return (
                <ResultCard
                  key={result._id}
                  result={result}
                  activeWorkflowIds={activeWorkflowIds}
                  setActiveWorkflowIds={setActiveWorkflowIds}
                />
              )
            })}
          </section>
        )}

        {/* Empty State */}
        {scrapeResults && scrapeResults.length === 0 && (
          <section className="border border-dashed border-neutral-300 rounded-lg p-10 text-center text-xs uppercase tracking-[0.4em] text-neutral-400">
            No analyses yet
          </section>
        )}
      </div>
    </main>
  )
}

function ResultCard({
  result,
  activeWorkflowIds,
  setActiveWorkflowIds
}: {
  result: any
  activeWorkflowIds: Set<string>
  setActiveWorkflowIds: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  // Always query status so we can show failed workflows even after they're removed from active list
  const status = useQuery(
    api.index.getWorkflowStatus,
    { workflowId: result.workflowId }
  )
  const deleteAnalysis = useMutation(api.helpers.deleteAnalysis)

  // Clean up completed workflows (but keep failed ones visible)
  useEffect(() => {
    if (status?.isComplete && !status?.hasFailed && activeWorkflowIds.has(result.workflowId)) {
      setActiveWorkflowIds(prev => {
        const next = new Set(prev)
        next.delete(result.workflowId)
        return next
      })
    }
  }, [status?.isComplete, status?.hasFailed, result.workflowId, activeWorkflowIds, setActiveWorkflowIds])

  const getStepName = (step: any) => {
    if (step.handle?.includes('scrapeSite')) return 'Scraping website'
    if (step.handle?.includes('analyzeSite')) return 'Analyzing content'
    if (step.handle?.includes('storeScrapeResult')) return 'Saving results'
    return step.name || 'Processing'
  }

  const getStepStatus = (entry: any) => {
    if (entry.step.inProgress) return 'running'
    if (entry.step.runResult?.kind === 'success') return 'completed'
    // If step failed but workflow is still running, it's retrying
    if (entry.step.runResult?.kind === 'failed' && status?.isRunning) return 'retrying'
    if (entry.step.runResult?.kind === 'failed') return 'failed'
    return 'pending'
  }

  // Check if any step is retrying (failed but workflow still running)
  const hasRetryingStep = status?.journalEntries?.some((entry: any) =>
    entry.step.runResult?.kind === 'failed' && status?.isRunning
  )

  const isClickable = !status?.isRunning && !status?.hasFailed

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this analysis?')) {
      try {
        await deleteAnalysis({ id: result._id })
        // Remove from active workflows if it was active
        if (activeWorkflowIds.has(result.workflowId)) {
          setActiveWorkflowIds(prev => {
            const next = new Set(prev)
            next.delete(result.workflowId)
            return next
          })
        }
      } catch (error) {
        console.error('Failed to delete analysis:', error)
      }
    }
  }

  const cardContent = (
    <div className="px-5 py-4 relative">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide break-all flex-1">
          {result.siteUrl}
        </h3>
        <div className="flex items-center gap-2">
          {hasRetryingStep && (
            <span className="text-[10px] uppercase tracking-wider text-orange-600 whitespace-nowrap">
              Retrying...
            </span>
          )}
          {status?.isRunning && !hasRetryingStep && (
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Processing...
            </span>
          )}
          {status?.hasFailed && !status?.isRunning && (
            <span className="text-[10px] uppercase tracking-wider text-red-600 whitespace-nowrap">
              Failed
            </span>
          )}
          {status?.isComplete && !status?.hasFailed && (
            <span className="text-[10px] uppercase tracking-wider text-green-600 whitespace-nowrap">
              Complete
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="absolute bottom-4 right-4 text-neutral-400 hover:text-red-600 transition p-1"
        title="Delete analysis"
      >
        <Trash size={14} />
      </button>

      {/* Step-by-step progress */}
      {status?.journalEntries && status.journalEntries.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {status.journalEntries.map((entry: any, idx: number) => {
            const stepStatus = getStepStatus(entry)
            return (
              <div key={idx} className="flex items-center gap-2 text-[10px] uppercase tracking-wide">
                <span className={`w-1.5 h-1.5 rounded-full ${stepStatus === 'completed' ? 'bg-green-600' :
                    stepStatus === 'running' ? 'bg-blue-600 animate-pulse' :
                      stepStatus === 'retrying' ? 'bg-orange-600 animate-pulse' :
                        stepStatus === 'failed' ? 'bg-red-600' :
                          'bg-neutral-300'
                  }`} />
                <span className={
                  stepStatus === 'failed' ? 'text-red-600' :
                    stepStatus === 'retrying' ? 'text-orange-600' :
                      'text-neutral-600'
                }>
                  {getStepName(entry.step)}
                  {stepStatus === 'retrying' && ' (retrying...)'}
                </span>
                {(stepStatus === 'failed' || stepStatus === 'retrying') && entry.step.runResult?.error && (
                  <span className={`text-[9px] normal-case truncate flex-1 ${stepStatus === 'retrying' ? 'text-orange-500' : 'text-red-500'
                    }`}>
                    {entry.step.runResult.error.includes('timeout')
                      ? 'Timeout - site took too long to load'
                      : entry.step.runResult.error.includes('503')
                        ? 'Service unavailable (503) - retrying...'
                        : entry.step.runResult.error.includes('valid top-level domain')
                          ? 'Invalid URL - check the domain'
                          : entry.step.runResult.error.substring(0, 50)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Error message - show when retrying */}
      {hasRetryingStep && (() => {
        const failedEntry = status?.journalEntries?.find((e: any) =>
          e.step.runResult?.kind === 'failed' && status?.isRunning
        )
        const errorMessage = failedEntry?.step.runResult?.kind === 'failed'
          ? failedEntry.step.runResult.error
          : undefined
        return (
          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-[10px] text-orange-700 uppercase tracking-wide">
            {errorMessage?.includes('503')
              ? 'Service unavailable (503) - Retrying automatically...'
              : 'An error occurred - Retrying automatically...'}
          </div>
        )
      })()}
      {status?.hasFailed && !status?.isRunning && status?.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-[10px] text-red-700 uppercase tracking-wide">
          {status.error.includes('timeout')
            ? 'Timeout: The website took too long to respond (60s limit)'
            : status.error.includes('valid top-level domain')
              ? 'Invalid URL: The URL must have a valid top-level domain (e.g., .com, .org)'
              : status.error.substring(0, 100)}
        </div>
      )}

      <p className="text-[10px] text-neutral-500 uppercase mt-2">
        {hasRetryingStep
          ? 'Retrying...'
          : status?.isRunning
            ? 'In progress'
            : status?.hasFailed
              ? 'Failed'
              : new Date(result._creationTime).toLocaleString()
        }
      </p>
    </div>
  )

  if (isClickable) {
    return (
      <Link
        to="/analysis/$id"
        preload="viewport"
        params={{ id: result._id }}
        className="block border border-neutral-200 rounded-lg bg-white hover:border-black transition cursor-pointer"
      >
        {cardContent}
      </Link>
    )
  }

  return (
    <div className="block border border-neutral-200 rounded-lg bg-white">
      {cardContent}
    </div>
  )
}
