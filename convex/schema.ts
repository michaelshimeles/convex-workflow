import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
// convex/schema.ts
export default defineSchema({
  siteAnalysis: defineTable({
    siteUrl: v.string(),
    workflowId: v.string(),
    analysis: v.string(),
  }).index("by_workflowId", ["workflowId"]), // Add index for lookups
});

