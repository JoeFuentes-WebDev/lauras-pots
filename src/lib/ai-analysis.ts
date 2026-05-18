import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export type ImageAnalysis = {
  name: string
  category: string
  pieceCount: number
  description: string
  tags: string[]
  aiLabel: string
}

export async function analyzeProductImage(imageBase64: string, mediaType: string): Promise<ImageAnalysis> {
  const response = await client.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `You are analyzing a photo of handmade pottery for an online shop called Laura's Pots.

Respond ONLY with a JSON object (no markdown, no backticks) with these fields:
{
  "name": "short descriptive product name (e.g. 'Terracotta Mug', 'Blue Glazed Bowl')",
  "category": "one of exactly: mug, bowl, vase, plate, set, other (always lowercase singular)",
  "pieceCount": number of individual pottery pieces visible in the image,
  "description": "1-2 sentence description of the piece, focusing on glaze, texture, shape",
  "tags": ["array", "of", "descriptive", "tags", "like", "terracotta", "glazed", "stoneware"],
  "aiLabel": "brief raw description of what you see"
}`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    return JSON.parse(text) as ImageAnalysis
  } catch {
    // Fallback if parsing fails
    return {
      name: 'Handmade Pottery Piece',
      category: 'other',
      pieceCount: 1,
      description: 'A beautiful handmade pottery piece.',
      tags: ['handmade'],
      aiLabel: text.slice(0, 100),
    }
  }
}