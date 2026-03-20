import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly dimensions = 1536;
  private readonly model = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
  private readonly client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  private localEmbed(text: string): number[] {
    const vector = new Array(this.dimensions).fill(0);

    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      const slot = (code + index * 31) % this.dimensions;
      const signed = ((code % 23) - 11) / 11;
      vector[slot] += signed;
    }

    const magnitude = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );
    if (!magnitude) return vector;

    return vector.map((value) => value / magnitude);
  }

  async embedText(text?: string | null): Promise<number[] | null> {
    const clean = text?.trim();
    if (!clean) return null;
    if (!this.client) return this.localEmbed(clean);

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: clean,
      });

      return response.data[0]?.embedding ?? null;
    } catch (error) {
      this.logger.warn(
        'Failed to generate remote embedding, using local fallback embedding',
      );
      return this.localEmbed(clean);
    }
  }

  toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }
}
