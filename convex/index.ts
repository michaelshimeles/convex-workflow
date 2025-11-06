import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

export const workflow = new WorkflowManager(components.workflow, {
    workpoolOptions: {
        defaultRetryBehavior: {
            maxAttempts: 3,
            initialBackoffMs: 100,
            base: 2,
        },
        retryActionsByDefault: true,
    }
});

export const siteScrapeAndAnalyzeWorkflow = workflow.define({
    args: { siteUrl: v.string() },
    returns: v.any(),
    handler: async (step, args): Promise<any> => {
        const actionResult = await step.runAction(
            internal.tools.scrapeSite,
            { siteUrl: args.siteUrl },
        );

        const siteContent = actionResult.markdown;

        if (!siteContent) {
            throw new Error('No site content found');
        }

        const analysisResult = await step.runAction(
            internal.tools.analyzeSite,
            { siteContent },
        );

        await step.runMutation(internal.helpers.storeScrapeResult, {
            siteUrl: args.siteUrl,
            workflowId: step.workflowId,
            analysis: JSON.stringify(analysisResult.content),
        });
        return analysisResult.content ?? '';
    },
});


export const kickoffWorkflow = mutation({
    args: { siteUrl: v.string() },
    handler: async (ctx, args): Promise<string> => {
        const workflowId = await workflow.start(
            ctx,
            internal.index.siteScrapeAndAnalyzeWorkflow,
            { siteUrl: args.siteUrl },
            {
                context: { name: args.siteUrl },
            },
        );

        // Store a placeholder entry immediately so we can track the workflow
        // even before it completes and stores results
        await ctx.db.insert("siteAnalysis", {
            siteUrl: args.siteUrl,
            workflowId: workflowId as string,
            analysis: "", // Empty placeholder, will be updated when workflow completes
        });

        return workflowId;
    },
});


export const getWorkflowStatus = query({
    args: { workflowId: v.string() },
    returns: v.object({
        isRunning: v.boolean(),
        isComplete: v.boolean(),
        hasFailed: v.boolean(),
        error: v.optional(v.string()),
        inProgress: v.array(v.any()),
        journalEntries: v.array(v.any()),
        workflow: v.any(),
    }),
    handler: async (ctx, args) => {
        const status = await ctx.runQuery(components.workflow.journal.load, {
            workflowId: args.workflowId,
        });

        const isComplete = !!status.workflow.runResult;
        const hasFailed = status.workflow.runResult?.kind === "failed";
        const error = status.workflow.runResult?.kind === "failed"
            ? status.workflow.runResult.error
            : undefined;
        const isRunning = status.journalEntries.length > 0 && !isComplete;

        return {
            isRunning,
            isComplete,
            hasFailed,
            error,
            inProgress: status.journalEntries.filter((entry) => entry.step.inProgress).map((entry) => entry.step),
            journalEntries: status.journalEntries,
            workflow: status.workflow,
        };
    },
});

// Get all active workflow IDs from results
export const getActiveWorkflowIds = query({
    handler: async (ctx) => {
        const results = await ctx.db.query("siteAnalysis").collect();
        const workflowIds = new Set<string>();

        // Check which workflows are still active
        for (const result of results) {
            try {
                const status = await ctx.runQuery(components.workflow.journal.load, {
                    workflowId: result.workflowId,
                });
                const isComplete = !!status.workflow.runResult;
                if (!isComplete) {
                    workflowIds.add(result.workflowId);
                }
            } catch {
                // If we can't load the workflow, skip it
            }
        }

        return Array.from(workflowIds);
    },
});
