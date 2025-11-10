# Website Analyzer

A real-time website analysis tool built with Convex Workflows, TanStack Router, and AI. Analyze websites by scraping their content and generating AI-powered summaries using Claude Sonnet.

## Features

- **Concurrent Workflow Execution**: Run multiple website analyses simultaneously
- **Real-time Progress Tracking**: See step-by-step progress for each workflow
  - Scraping website
  - Analyzing content
  - Saving results
- **Persistent State**: Workflows persist across page refreshes
- **Error Handling**: Automatic retries with exponential backoff (up to 3 attempts)
- **Visual Status Indicators**: 
  - 🟢 Completed steps
  - 🔵 Running steps (with pulse animation)
  - 🟠 Retrying steps
  - 🔴 Failed steps
- **Detailed Error Messages**: User-friendly error messages for timeouts, invalid URLs, and service errors
- **Analysis Management**: View, delete, and navigate to detailed analysis pages
- **Clean UI**: Minimalist black and white design with monospace fonts

## Tech Stack

- **Backend**: 
  - [Convex](https://convex.dev) - Backend-as-a-Service with real-time database
  - [Convex Workflows](https://www.convex.dev/components/workflow) - Workflow orchestration
  - [Firecrawl](https://firecrawl.dev) - Website scraping
  - [Anthropic Claude](https://anthropic.com) - AI content analysis

- **Frontend**:
  - [TanStack Router](https://tanstack.com/router) - File-based routing
  - [TanStack Start](https://tanstack.com/start) - Full-stack React framework
  - [React](https://react.dev) - UI library
  - [Tailwind CSS](https://tailwindcss.com) - Styling
  - [Lucide React](https://lucide.dev) - Icons
  - [React Markdown](https://github.com/remarkjs/react-markdown) - Markdown rendering

## Project Structure

```
workflow/
├── convex/              # Backend functions
│   ├── index.ts        # Workflow definitions and public API
│   ├── helpers.ts      # Helper functions (queries, mutations)
│   ├── tools.ts        # External API integrations (Firecrawl, Anthropic)
│   └── schema.ts       # Database schema
├── src/
│   ├── routes/
│   │   ├── index.tsx   # Main analysis page
│   │   ├── analysis.$id.tsx  # Analysis detail page
│   │   └── game.tsx    # Clicking game (bonus feature)
│   └── router.tsx      # Router configuration
└── public/             # Static assets
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Convex account ([sign up](https://convex.dev))
- Firecrawl API key ([get one here](https://firecrawl.dev))
- Anthropic API key ([get one here](https://console.anthropic.com))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd workflow
```

2. Install dependencies:
```bash
npm install
```

3. Set up Convex:
```bash
npx convex dev
```

4. Configure environment variables in Convex dashboard:
   - `FIRECRAWL_API_KEY` - Your Firecrawl API key
   - `ANTHROPIC_API_KEY` - Your Anthropic API key

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## How It Works

### Workflow Process

1. **User submits URL** → `kickoffWorkflow` mutation is called
2. **Placeholder created** → Database entry is created immediately with empty analysis
3. **Workflow starts** → Convex Workflow orchestrates the following steps:
   - **Step 1**: Scrape website using Firecrawl
   - **Step 2**: Analyze content using Claude Sonnet
   - **Step 3**: Store results in database
4. **Real-time updates** → Frontend queries workflow status and displays progress
5. **Completion** → Analysis is updated with AI-generated summary

### Database Schema

```typescript
siteAnalysis: {
  siteUrl: string
  workflowId: string (indexed)
  analysis: string (markdown content)
  _creationTime: number
  _id: Id<"siteAnalysis">
}
```

### Workflow Configuration

- **Retry Behavior**: 
  - Max attempts: 3
  - Initial backoff: 100ms
  - Exponential base: 2
- **Timeout**: 60 seconds per step
- **Concurrency**: Unlimited (multiple workflows can run simultaneously)

## API Reference

### Public Mutations

- `api.index.kickoffWorkflow({ siteUrl: string })` - Start a new analysis workflow

### Public Queries

- `api.helpers.getScrapeResult()` - Get all analysis results
- `api.helpers.getScrapeResultById({ id: Id<"siteAnalysis"> })` - Get single analysis
- `api.index.getWorkflowStatus({ workflowId: string })` - Get workflow status
- `api.index.getActiveWorkflowIds()` - Get all active workflow IDs

### Internal Functions

- `internal.tools.scrapeSite({ siteUrl: string })` - Scrape website content
- `internal.tools.analyzeSite({ siteContent: string })` - Analyze content with AI
- `internal.helpers.storeScrapeResult({ siteUrl, workflowId, analysis })` - Store results

## Features in Detail

### Step-by-Step Progress

Each workflow card shows:
- Current step being executed
- Status of each step (pending/running/completed/failed/retrying)
- Error messages for failed steps
- Retry indicators when steps are being retried

### Error Handling

The app handles various error scenarios:
- **Timeout errors**: Shows "Timeout - site took too long to load"
- **503 Service Unavailable**: Shows retry status
- **Invalid URLs**: Shows "Invalid URL - check the domain"
- **Generic errors**: Displays truncated error message

### State Persistence

- Workflows are tracked from the moment they start
- Placeholder entries ensure workflows persist across refreshes
- Active workflows are automatically detected on page load
- Completed workflows are removed from active tracking

## Development

### Available Scripts

- `npm run dev` - Start development server (web + Convex)
- `npm run build` - Build for production
- `npm run lint` - Run linter
- `npm run format` - Format code with Prettier

### Code Style

- TypeScript strict mode enabled
- ESLint configuration included
- Prettier for code formatting
- Convex best practices followed

## License

MIT

