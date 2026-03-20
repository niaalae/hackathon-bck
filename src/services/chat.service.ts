import { Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '@/env';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);
    private get apiKey() {
        return process.env.GROQ_API_KEY ?? '';
    }

    private get model() {
        return process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';
    }
    private readonly endpoint = 'https://api.groq.com/openai/v1/chat/completions';

    private readonly systemPrompt = [
        'You are Trippple AI, a friendly travel assistant for Morocco (especially the Fes-Meknes region).',
        'You ONLY answer questions about travel, trips, tourism, hotels, riads, restaurants, activities, transport, budgets, and safety in Morocco.',
        'If the user asks about anything unrelated to travel or Morocco, politely say: "I can only help with travel-related questions about Morocco! 🇲🇦"',
        'Keep answers short (under 80 words), friendly, and helpful.',
        'Use occasional emojis to feel warm.',
        'Never return JSON. Reply in plain text only.',
    ].join(' ');

    private loadGroqKeyFromFile(): string {
        const candidates = [
            join(process.cwd(), 'backend', '.env'),
            join(process.cwd(), '.env'),
            join(__dirname, '..', '..', '.env'),
            join(__dirname, '..', '..', '..', '.env'),
        ];

        for (const filePath of candidates) {
            if (!existsSync(filePath)) continue;
            const contents = readFileSync(filePath, 'utf8');
            const line = contents
                .split('\n')
                .find((entry) => entry.trim().startsWith('GROQ_API_KEY='));
            if (!line) continue;
            const raw = line.split('=')[1]?.trim() ?? '';
            const cleaned = raw.replace(/^['"]|['"]$/g, '');
            if (cleaned) return cleaned;
        }

        return '';
    }

    async chat(message: string, history: ChatMessage[]): Promise<string> {
        loadEnv()
        let apiKey = this.apiKey
        if (!apiKey) {
            apiKey = this.loadGroqKeyFromFile()
            if (apiKey) {
                process.env.GROQ_API_KEY = apiKey
            }
        }
        const trimmed = message.trim();
        if (!trimmed) return 'Please ask me something about your trip! 🧳';

        if (!apiKey) {
            return 'The AI agent is not configured yet. Please add your Groq API key to .env 🔑';
        }

        const messages = [
            { role: 'system' as const, content: this.systemPrompt },
            ...history.slice(-6).map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
            { role: 'user' as const, content: trimmed },
        ];

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature: 0.7,
                    max_tokens: 256,
                }),
            });

            if (!response.ok) {
                this.logger.warn(`Groq API error: ${response.status}`);
                return 'Sorry, I had trouble thinking. Try again in a moment! 🙏';
            }

            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content ?? '';

            return text.trim() || 'Hmm, I could not come up with an answer. Try rephrasing? 🤔';
        } catch (error) {
            this.logger.warn(`Chat API failed: ${String(error)}`);
            return 'Something went wrong. Please try again! 🔄';
        }
    }
}
