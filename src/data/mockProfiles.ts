import { CreatorDataset } from "@/types/evaluator";

/**
 * Mock profiles have been completely removed.
 * The system strictly evaluates real Instagram accounts discovered in the local/edge /cache
 * directory or live scraped via Bright Data.
 */
export const CREATOR_DATASETS: Record<string, CreatorDataset> = {};
