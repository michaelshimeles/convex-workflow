import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";


export const storeScrapeResult = internalMutation({
    args: { siteUrl: v.string(), workflowId: v.string(), analysis: v.string() },
    handler: async (ctx, args): Promise<string> => {
        // Find existing entry by workflowId and update it, or create new one
        const existing = await ctx.db
            .query("siteAnalysis")
            .withIndex("by_workflowId", (q) => q.eq("workflowId", args.workflowId))
            .first();

        if (existing) {
            // Update existing placeholder entry
            await ctx.db.patch(existing._id, {
                analysis: args.analysis,
            });
            return existing._id;
        } else {
            // Create new entry if it doesn't exist (shouldn't happen, but safety)
            const result = await ctx.db.insert("siteAnalysis", {
                siteUrl: args.siteUrl,
                workflowId: args.workflowId,
                analysis: args.analysis,
            });
            return result;
        }
    },
})

export const getScrapeResult = query({
    handler: async (ctx, args) => {
        const result = await ctx.db.query("siteAnalysis").collect();
        return result
    },
})

export const getScrapeResultById = query({
    args: { id: v.id("siteAnalysis") },
    handler: async (ctx, args) => {
        const result = await ctx.db.get(args.id);
        return result
    },
})

export const deleteAnalysis = mutation({
    args: { id: v.id("siteAnalysis") },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return null;
    },
})
