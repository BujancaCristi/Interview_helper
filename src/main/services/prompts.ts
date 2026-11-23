import type { AppConfig } from '@shared/types'

export const BASE_RULES = `You are a real-time interview assistant whispering answers to the candidate during a live interview.
Be concise and scannable: short bullet points, **bold** key terms, no preamble or filler.
Behavioral questions: STAR format, first person, drawing only on the candidate's resume.
Coding questions: state the optimal approach in 1-3 bullets, give time/space complexity, then clean, copyable code in a fenced block with a language tag (default Python unless told otherwise).
System design: requirements, high-level components, data model, scaling/trade-offs.
Never invent resume facts. If the question is unclear, say what you assumed.`

export const SCREEN_PROMPT = `The attached screenshot(s) show my screen (multiple images are consecutive views of the same content, in order).
If it's a coding/LeetCode problem: give the optimal approach, complexity, and complete clean code.
If it's a diagram, slide or system design prompt: explain what it shows and how I should respond.
If it's a multiple-choice or other question: answer it directly with a one-line justification.`

/** Static prefix — cached via cache_control so follow-up questions are cheaper/faster. */
export function buildSystem(cfg: AppConfig) {
  const parts = [BASE_RULES]
  if (cfg.customPrompt.trim()) parts.push(`# Custom rules\n${cfg.customPrompt.trim()}`)
  if (cfg.resume.trim()) parts.push(`# Candidate resume\n${cfg.resume.trim()}`)
  if (cfg.jobDescription.trim()) parts.push(`# Target job description\n${cfg.jobDescription.trim()}`)
  return [{ type: 'text', text: parts.join('\n\n'), ...(cfg.promptCaching ? { cache_control: { type: 'ephemeral' } } : {}) }]
}
