import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import sharp from "sharp";
import { z } from "zod";
import { CATEGORIES, isCategory, type Category } from "@/lib/categories";
import type { PhotoRow } from "@/lib/types";

// Every Claude model name LoreTree uses lives here, nowhere else.
export const MODELS = {
  analysis: "claude-haiku-4-5",
  context: "claude-haiku-4-5",
  reminisce: "claude-sonnet-5",
} as const;

// Anthropic's published per-token pricing for Haiku 4.5, used only to show
// Matt a rough cost estimate after each batch.
const HAIKU_PRICE_PER_TOKEN = {
  input: 1 / 1_000_000,
  output: 5 / 1_000_000,
};

const client = new Anthropic();

const analysisResultSchema = z.object({
  description: z.string().min(1),
  category: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1).max(8),
  event_name: z.string().min(1).nullable(),
});

export interface AnalysisResult {
  description: string;
  category: Category;
  keywords: string[];
  event_name: string | null;
}

// Claude sometimes returns a near-miss on category (different casing, a
// synonym) even though the prompt lists the exact options. Falling back to
// "Other" instead of erroring keeps a perfectly good description and keyword
// set instead of throwing the whole photo into ai_status = 'error'.
function coerceCategory(raw: string): Category {
  if (isCategory(raw)) return raw;
  const trimmed = raw.trim().toLowerCase();
  const match = CATEGORIES.find((c) => c.toLowerCase() === trimmed);
  return match ?? "Other";
}

export interface AnalysisUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AnalysisOutcome {
  result: AnalysisResult;
  usage: AnalysisUsage;
}

export interface PhotoContext {
  people: string[];
  place: string | null;
  eventName: string | null;
  appleLabels: string[];
  takenAt: string | null;
}

function buildAnalysisPrompt(context: PhotoContext): string {
  const knownFacts = [
    context.people.length > 0 ? `People Apple has identified: ${context.people.join(", ")}.` : null,
    context.place ? `Place: ${context.place}.` : null,
    context.takenAt ? `Taken: ${context.takenAt}.` : null,
    context.eventName ? `Apple's automatic event name: "${context.eventName}".` : null,
    context.appleLabels.length > 0 ? `Apple's scene labels: ${context.appleLabels.join(", ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return `You are writing a warm, specific photo description for a personal memory app. Use only what you are told below and what you can see in the photo. Never invent names, places, or events that were not given to you.

${knownFacts || "No metadata is available for this photo besides the image itself."}

Reply with JSON only, no other text, matching this exact shape:
{
  "description": "2 to 3 warm, specific sentences describing the photo. Use people's names if given.",
  "category": "exactly one of: ${CATEGORIES.join(", ")}",
  "keywords": ["3 to 6 short keyword tags"],
  "event_name": "a better, more specific name for this event if the facts above support one, otherwise null"
}`;
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in Claude's response");
  }
  return text.slice(start, end + 1);
}

export async function analyzePhoto(photo: PhotoRow, context: PhotoContext): Promise<AnalysisOutcome> {
  if (!photo.display_path) {
    throw new Error("Photo has no display image to analyze");
  }

  const imageBuffer = await sharp(path.join(process.cwd(), photo.display_path))
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const response = await client.messages.create({
    model: MODELS.analysis,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: imageBuffer.toString("base64") },
          },
          { type: "text", text: buildAnalysisPrompt(context) },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
  if (!textBlock) {
    throw new Error("Claude did not return a text response");
  }

  const parsed = JSON.parse(extractJsonObject(textBlock.text));
  const validated = analysisResultSchema.parse(parsed);
  const result: AnalysisResult = { ...validated, category: coerceCategory(validated.category) };

  return {
    result,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

export function estimateCost(usage: AnalysisUsage): number {
  return usage.inputTokens * HAIKU_PRICE_PER_TOKEN.input + usage.outputTokens * HAIKU_PRICE_PER_TOKEN.output;
}

const CONTEXT_TAG_TYPES = ["person", "place", "event", "keyword"] as const;
export type ContextTagType = (typeof CONTEXT_TAG_TYPES)[number];

const contextResultSchema = z.object({
  description: z.string().min(1),
  new_tags: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(CONTEXT_TAG_TYPES),
    })
  ),
});

export interface ContextResult {
  description: string;
  new_tags: { name: string; type: ContextTagType }[];
}

function buildContextPrompt(existingDescription: string, contextText: string): string {
  return `You are updating a personal photo memory app's description of a photo, using context the photo's owner just added.

Current description: "${existingDescription}"

Context the owner added: "${contextText}"

Reply with JSON only, no other text, matching this exact shape:
{
  "description": "The description rewritten to naturally weave in the new context. Keep every existing fact from the current description, never invent anything beyond what's given, 2 to 4 sentences.",
  "new_tags": [{ "name": "short tag name", "type": "one of: person, place, event, keyword" }]
}
Only include tags for people, places, events, or keywords the context text actually names. If nothing new is worth tagging, use an empty array.`;
}

export async function mergeContext(existingDescription: string, contextText: string): Promise<ContextResult> {
  const response = await client.messages.create({
    model: MODELS.context,
    max_tokens: 1024,
    messages: [{ role: "user", content: buildContextPrompt(existingDescription, contextText) }],
  });

  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
  if (!textBlock) {
    throw new Error("Claude did not return a text response");
  }

  const parsed = JSON.parse(extractJsonObject(textBlock.text));
  return contextResultSchema.parse(parsed);
}
