import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useState, useEffect } from 'react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/game')({
  component: Game,
})

function Game() {
  const [score, setScore] = useState(0)
  const [clicksPerSecond, setClicksPerSecond] = useState(0)
  const [startTime] = useState(Date.now())
  const [clickHistory, setClickHistory] = useState<number[]>([])
  
  // Get all workflows to show their status
  const scrapeResults = useQuery(api.helpers.getScrapeResult, {})
  const activeWorkflowIds = useQuery(api.index.getActiveWorkflowIds, {})

  // Calculate clicks per second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const recentClicks = clickHistory.filter(time => now - time < 1000)
      setClicksPerSecond(recentClicks.length)
    }, 100)

    return () => clearInterval(interval)
  }, [clickHistory])

  const handleClick = () => {
    const now = Date.now()
    setScore(prev => prev + 1)
    setClickHistory(prev => [...prev.slice(-19), now]) // Keep last 20 clicks
  }

  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)

  // Get active workflows
  const activeWorkflows = scrapeResults?.filter(result => 
    activeWorkflowIds?.includes(result.workflowId)
  ) || []

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-neutral-50 text-black font-mono">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight uppercase mb-2">Clicker Game</h1>
            <p className="text-sm text-neutral-600 uppercase">
              Workflows run in the background while you play!
            </p>
          </div>
          <Link
            to="/"
            className="px-4 py-2 text-sm uppercase tracking-wider border border-black hover:bg-black hover:text-white transition"
          >
            Back to Analyzer
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Stats */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{score.toLocaleString()}</div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">Total Clicks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{clicksPerSecond}</div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">Clicks/Second</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{elapsedSeconds}</div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">Seconds</div>
                </div>
              </div>
            </div>

            {/* Click Button */}
            <div className="bg-white border border-neutral-200 rounded-lg p-8">
              <button
                onClick={handleClick}
                className="w-full h-64 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold uppercase tracking-wider rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                CLICK ME!
              </button>
              <p className="text-center text-xs text-neutral-500 uppercase tracking-wider mt-4">
                Click as fast as you can!
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <p className="text-xs text-neutral-600 uppercase tracking-wide leading-relaxed">
                <strong className="text-black">Notice:</strong> While you're clicking away, workflows continue running in the background. 
                Check the panel on the right to see real-time status updates. This demonstrates the durability 
                and power of Convex workflows - they persist even when you navigate away or do other things!
              </p>
            </div>
          </div>

          {/* Workflow Status Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-neutral-200 rounded-lg p-4 sticky top-4">
              <h2 className="text-lg font-bold uppercase tracking-wide mb-4">
                Active Workflows
              </h2>
              
              {activeWorkflows.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-4">
                    No active workflows
                  </p>
                  <Link
                    to="/"
                    className="text-xs uppercase tracking-wider text-blue-600 hover:text-blue-800 underline"
                  >
                    Start a workflow →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {activeWorkflows.map((result) => (
                    <WorkflowStatusCard key={result._id} result={result} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function WorkflowStatusCard({ result }: { result: any }) {
  const status = useQuery(
    api.index.getWorkflowStatus,
    { workflowId: result.workflowId }
  )

  const getStepName = (step: any) => {
    if (step.handle?.includes('scrapeSite')) return 'Scraping'
    if (step.handle?.includes('analyzeSite')) return 'Analyzing'
    if (step.handle?.includes('storeScrapeResult')) return 'Saving'
    return step.name || 'Processing'
  }

  const getStepStatus = (entry: any) => {
    if (entry.step.inProgress) return 'running'
    if (entry.step.runResult?.kind === 'success') return 'completed'
    if (entry.step.runResult?.kind === 'failed' && status?.isRunning) return 'retrying'
    if (entry.step.runResult?.kind === 'failed') return 'failed'
    return 'pending'
  }

  const hasRetryingStep = status?.journalEntries?.some((entry: any) =>
    entry.step.runResult?.kind === 'failed' && status?.isRunning
  )

  return (
    <div className="border border-neutral-200 rounded p-3 bg-neutral-50">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide break-all flex-1">
          {result.siteUrl}
        </h3>
        {hasRetryingStep && (
          <span className="text-[9px] uppercase tracking-wider text-orange-600 whitespace-nowrap">
            Retrying
          </span>
        )}
        {status?.isRunning && !hasRetryingStep && (
          <span className="text-[9px] uppercase tracking-wider text-blue-600 whitespace-nowrap">
            Running
          </span>
        )}
        {status?.hasFailed && !status?.isRunning && (
          <span className="text-[9px] uppercase tracking-wider text-red-600 whitespace-nowrap">
            Failed
          </span>
        )}
        {status?.isComplete && !status?.hasFailed && (
          <span className="text-[9px] uppercase tracking-wider text-green-600 whitespace-nowrap">
            Done
          </span>
        )}
      </div>

      {/* Steps */}
      {status?.journalEntries && status.journalEntries.length > 0 && (
        <div className="space-y-1 mt-2">
          {status.journalEntries.slice(-3).map((entry: any, idx: number) => {
            const stepStatus = getStepStatus(entry)
            return (
              <div key={idx} className="flex items-center gap-2 text-[9px] uppercase tracking-wide">
                <span className={`w-1 h-1 rounded-full ${
                  stepStatus === 'completed' ? 'bg-green-600' :
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
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

