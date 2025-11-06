"use node";
import Firecrawl from '@mendable/firecrawl-js';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { Anthropic } from '@anthropic-ai/sdk';


// You can fetch data from and send data to third-party APIs via an action:
export const scrapeSite = internalAction({
  // Validators for arguments.
  args: {
    siteUrl: v.string(),
  },

  // Action implementation.
  handler: async (ctx, args) => {
    const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! });

    const doc = await firecrawl.scrape(args.siteUrl, { formats: ['markdown', 'html'] });

    return doc;
  },
})

export const analyzeSite = internalAction({
  args: { siteContent: v.string() },
  handler: async (ctx, args) => {

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: "You are a helpful assistant that analyzes websites and provides a summary of the content. In one paragraph, provide a summary of the content of the website. In another paragraph, provide a list of the most important links on the website.",
      messages: [
        { "role": "user", "content": args.siteContent }
      ]
    });

    return response
  }
})