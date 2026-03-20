import { Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '@/env';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { randomInt } from 'crypto';

type BookingSuggestion = {
  title: string;
  type: 'flight' | 'stay' | 'activity' | 'transport' | 'rental' | 'guide' | 'other';
  priceRange?: string;
  notes?: string;
};

type TravelPlan = {
  from: { city: string; country: string };
  to: { city: string; country: string };
  duration: number;
  totalBudget: number;
  totalEstimatedCost: number;
  budgetMatch: number;
  flights: FlightOption[];
  hotels: HotelOption[];
  itinerary: DayPlan[];
  budgetBreakdown: BudgetBreakdown;
  tips: string[];
  packingList: string[];
};

type FlightOption = {
  airline: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  price: number;
  isBestValue: boolean;
};

type HotelOption = {
  name: string;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  location: string;
  rating: number;
  amenities: string[];
  isRecommended: boolean;
};

type DayPlan = {
  day: number;
  theme: string;
  morning: string[];
  afternoon: string[];
  evening: string[];
  estimatedDailyCost: number;
};

type BudgetBreakdown = {
  flights: number;
  hotels: number;
  food: number;
  activities: number;
  transport: number;
  misc: number;
};

type HeroAgentResponse = {
  answer: string;
  intent: 'booking' | 'information' | 'collaboration' | 'guide' | 'new_trip';
  followUpQuestion: string | null;
  bookings: BookingSuggestion[];
  travelPlan?: TravelPlan;
  actions: AgentAction[];
};

type AgentActionType =
  | 'SHOW_TRIPS'
  | 'SHOW_GROUPS'
  | 'SHOW_BOOKINGS'
  | 'SHOW_GUIDES'
  | 'SHOW_MAP'
  | 'SHOW_QUESTS';

type AgentAction = {
  type: AgentActionType;
  payload?: Record<string, unknown>;
};

type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

@Injectable()
export class HeroAgentService {
  private readonly logger = new Logger(HeroAgentService.name);
  private get apiKey() {
    return process.env.GROQ_API_KEY ?? '';
  }

  private get model() {
    return process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';
  }
  private readonly endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly moroccoCities = [
    'Fes',
    'Marrakech',
    'Casablanca',
    'Chefchaouen',
    'Essaouira',
    'Agadir',
    'Rabat',
    'Tangier',
    'Merzouga',
    'Ouarzazate',
    'Imlil',
    'Dakhla',
  ];

  private fallbackBookings(
    prompt: string,
    intent: HeroAgentResponse['intent'] = 'information',
  ): BookingSuggestion[] {
    const short = prompt.slice(0, 48).trim();
    if (intent === 'guide') {
      return [
        {
          title: 'Local guide shortlist',
          type: 'guide',
          priceRange: 'Mid-range',
          notes: 'Verified guides matched to your language and budget.',
        },
        {
          title: 'Private walking tour',
          type: 'activity',
          priceRange: 'From $',
          notes: 'Cultural highlights with a licensed guide.',
        },
      ];
    }

    if (intent === 'collaboration') {
      return [
        {
          title: 'Find matching travel groups',
          type: 'other',
          notes: 'We will suggest active trips with similar dates and vibe.',
        },
      ];
    }

    const bookingTitle =
      intent === 'booking' || intent === 'new_trip'
        ? `Flight match: ${short || 'Flexible dates'}`
        : `Trip idea: ${short || 'Flexible dates'}`;

    return [
      {
        title: bookingTitle,
        type: 'flight',
        priceRange: 'Budget to mid-range',
        notes: 'We will surface the best time and price window.',
      },
      {
        title: 'Stay pick: central + high-rated',
        type: 'stay',
        priceRange: 'Mid-range',
        notes: 'Walking distance to key spots, flexible cancel.',
      },
      {
        title: 'Top activity: curated local experience',
        type: 'activity',
        priceRange: 'From $',
        notes: 'Shortlist with reviews and safety checks.',
      },
    ];
  }

  private isRandomRequested(prompt: string): boolean {
    return /(random|surprise|wild|whatever|anything|go wild|pick for me)/i.test(
      prompt,
    );
  }

  private isGreeting(prompt: string): boolean {
    const trimmed = prompt.trim().toLowerCase();
    if (!trimmed) return false;
    const greetingRegex = /^(hi|hey|hello|yo|sup|wassup|wasup|salam|salut|hola)(\b|!|\.|,|\s)/;
    if (!greetingRegex.test(trimmed)) return false;
    return trimmed.split(/\s+/).length <= 4;
  }

  private hasTravelSignal(prompt: string): boolean {
    return /(trip|travel|plan|booking|book|flight|hotel|riad|stay|itinerary|route|map|guide|tour|visit|vacation|group|collab|match)/i.test(
      prompt,
    );
  }

  private isVaguePrompt(prompt: string): boolean {
    const trimmed = prompt.trim();
    if (!trimmed) return true;
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    return (
      tokens.length <= 3 &&
      !this.hasTravelSignal(trimmed) &&
      !this.hasDestination(trimmed)
    );
  }

  private pickRandom<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty list');
    }
    const index =
      typeof randomInt === 'function'
        ? randomInt(items.length)
        : Math.floor(Math.random() * items.length);
    return items[index];
  }

  private hasDestination(prompt: string): boolean {
    return this.moroccoCities.some((city) =>
      new RegExp(`\\b${city}\\b`, 'i').test(prompt),
    );
  }

  private hasBudget(prompt: string): boolean {
    return /(\d{2,6})\s*(mad|dh|usd|\$)/i.test(prompt);
  }

  private hasDatesOrDuration(prompt: string): boolean {
    if (/\b\d+\s*(day|days|night|nights)\b/i.test(prompt)) return true;
    if (
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(prompt)
    ) {
      return true;
    }
    if (/\b20\d{2}-\d{2}-\d{2}\b/.test(prompt)) return true;
    return false;
  }

  private randomizePrompt(prompt: string): string {
    const needsCity = !this.hasDestination(prompt);
    const needsBudget = !this.hasBudget(prompt);
    const needsDates = !this.hasDatesOrDuration(prompt);

    const destination = needsCity
      ? this.pickRandom(this.moroccoCities)
      : 'specified';
    const origin = this.pickRandom(['Fes', 'Casablanca', 'Rabat', 'Tangier']);

    const duration = this.pickRandom([3, 4, 5, 6]);
    const startOffset = this.pickRandom([7, 10, 14, 21, 28]);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + startOffset);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration);
    const dateString = `${startDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })} to ${endDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`;

    const budgetMad = this.pickRandom([3200, 3800, 4500, 5200, 6000, 7200]);
    const budgetUsd = Math.round(budgetMad / 10);

    const details = [
      needsCity ? `Destination: ${destination}` : null,
      needsDates ? `Dates: ${dateString} (${duration} days)` : null,
      needsBudget ? `Budget: ${budgetMad} MAD (~$${budgetUsd})` : null,
      `Origin: ${origin}`,
    ]
      .filter(Boolean)
      .join(', ');

    if (!details) return prompt;

    return `${prompt}\n\nRandomized details (approved by user): ${details}.`;
  }

  private extractJson(text: string): string | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
  }

  private normalizeIntent(value: unknown): HeroAgentResponse['intent'] {
    const allowed: HeroAgentResponse['intent'][] = [
      'booking',
      'information',
      'collaboration',
      'guide',
      'new_trip',
    ];
    if (typeof value === 'string' && (allowed as string[]).includes(value)) {
      return value as HeroAgentResponse['intent'];
    }
    return 'information';
  }

  private inferIntentFromPrompt(prompt: string): HeroAgentResponse['intent'] {
    const text = prompt.toLowerCase();
    if (/(book|booking|reserve|reservation|flight|hotel|riad|stay|airbnb|rent|tickets?|checkout|pay)/.test(text)) {
      return 'booking';
    }
    if (/(guide|tour guide|local guide|guided tour|touring|guide me|private guide)/.test(text)) {
      return 'guide';
    }
    if (/(collab|collaborate|group|join|match|people|together|friends|partner|swipe|tinder|meet)/.test(text)) {
      return 'collaboration';
    }
    if (/(new trip|create trip|start a trip|build a trip|make a trip|trip from scratch)/.test(text)) {
      return 'new_trip';
    }
    return 'information';
  }

  private normalizeBookings(
    value: unknown,
    prompt: string,
    intent: HeroAgentResponse['intent'],
  ): BookingSuggestion[] {
    if (!Array.isArray(value)) {
      return this.fallbackBookings(prompt, intent);
    }
    const cleaned = value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Partial<BookingSuggestion>;
        if (!record.title || !record.type) return null;
        return {
          title: String(record.title),
          type: record.type as BookingSuggestion['type'],
          priceRange: record.priceRange ? String(record.priceRange) : undefined,
          notes: record.notes ? String(record.notes) : undefined,
        };
      })
      .filter(Boolean) as BookingSuggestion[];

    return cleaned.length > 0 ? cleaned : this.fallbackBookings(prompt, intent);
  }

  private normalizeFollowUp(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeAnswer(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  private stripTrailingQuestions(text: string): string {
    const parts = text.split(/(?<=[.!?])\s+/);
    while (parts.length > 0 && parts[parts.length - 1].trim().endsWith('?')) {
      parts.pop();
    }
    const cleaned = parts.join(' ').trim();
    return cleaned || text;
  }

  private buildActions(
    intent: HeroAgentResponse['intent'],
    bookings: BookingSuggestion[],
    travelPlan?: TravelPlan,
    prompt?: string,
  ): AgentAction[] {
    const actions: AgentAction[] = [];

    if (travelPlan) {
      actions.push({ type: 'SHOW_TRIPS', payload: { travelPlan } });
    }

    if (bookings.length > 0) {
      actions.push({
        type: 'SHOW_BOOKINGS',
        payload: { bookings, commissionRate: 0.1 },
      });
    }

    if ((intent === 'booking' || intent === 'new_trip') && !actions.some(action => action.type === 'SHOW_TRIPS')) {
      actions.push({ type: 'SHOW_TRIPS' });
    }

    if (intent === 'collaboration') {
      actions.push({ type: 'SHOW_GROUPS' });
    }

    if (intent === 'guide') {
      actions.push({ type: 'SHOW_GUIDES' });
    }

    if (prompt && /(route|map|navigate|navigation|itinerary|plan a route|route plan)/i.test(prompt)) {
      actions.push({ type: 'SHOW_MAP' });
    }

    if (intent === 'information' && actions.length === 0) {
      actions.push({ type: 'SHOW_TRIPS' });
    }

    return actions;
  }

  private shouldShowBookings(
    intent: HeroAgentResponse['intent'],
    prompt: string,
    randomRequested: boolean,
  ): boolean {
    if (intent === 'information') return false;
    if (intent === 'guide' || intent === 'collaboration') return true;
    if (intent === 'booking' || intent === 'new_trip') {
      return (
        (this.hasDestination(prompt) || randomRequested) &&
        (this.hasBudget(prompt) || randomRequested)
      );
    }
    return false;
  }

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

  async generateHeroReply(
    prompt: string,
    history?: HistoryMessage[],
  ): Promise<HeroAgentResponse> {
    loadEnv()
    let apiKey = this.apiKey
    if (!apiKey) {
      apiKey = this.loadGroqKeyFromFile()
      if (apiKey) {
        process.env.GROQ_API_KEY = apiKey
      }
    }
    const cleanPrompt = prompt.trim();
    const randomRequested = this.isRandomRequested(cleanPrompt);
    const finalPrompt = randomRequested
      ? this.randomizePrompt(cleanPrompt)
      : cleanPrompt;

    if (this.isGreeting(cleanPrompt) && !this.hasDestination(cleanPrompt)) {
      return {
        answer:
          "Hey! I'm Trippple, your Morocco travel concierge. Tell me a city or the vibe you want and I'll handle the rest.",
        intent: 'information',
        followUpQuestion: null,
        bookings: [],
        actions: [],
      };
    }
    if (this.isVaguePrompt(cleanPrompt)) {
      return {
        answer:
          "Hey! Tell me what you're dreaming about — a city, vibe, or quick idea — and I can handle the plan for you.",
        intent: 'information',
        followUpQuestion: null,
        bookings: [],
        actions: [],
      };
    }
    if (!cleanPrompt) {
      const bookings: BookingSuggestion[] = [];
      return {
        answer: 'Tell me your destination, dates, budget, and vibe. I will handle the rest.',
        intent: 'information',
        followUpQuestion: 'Do you want to create a new trip or match with a collaborator?',
        bookings,
        actions: this.buildActions('information', bookings, undefined, cleanPrompt),
      };
    }

    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY missing. Check backend/.env.');
      const inferredIntent = this.inferIntentFromPrompt(cleanPrompt);
      const bookings = this.shouldShowBookings(inferredIntent, cleanPrompt, randomRequested)
        ? this.fallbackBookings(cleanPrompt, inferredIntent)
        : [];
      return {
        answer:
          'I can suggest a plan, but the live AI agent is not connected yet. Here is a quick starter plan.',
        intent: inferredIntent,
        followUpQuestion: randomRequested
          ? null
          : 'Do you want to create a new trip with these suggestions?',
        bookings,
        actions: this.buildActions(inferredIntent, bookings, undefined, cleanPrompt),
      };
    }

    const systemInstruction = `You are Trippple, a Morocco travel specialist AI. Speak naturally and warmly.
Your job is to classify the user's intent and guide them to the right flow.
Intents: booking, information, collaboration, guide, new_trip.
Always use the conversation history. If the user answers a previous question, do NOT ask the same thing again.

If the user requests booking/reservations/flights/hotels, set intent=booking.
If the user asks for a guide or local tour, set intent=guide.
If the user wants to plan with friends/meet people/join a group, set intent=collaboration.
If the user explicitly asks to create/start a trip, set intent=new_trip.
Otherwise, set intent=information and provide a helpful response.

ONLY plan trips to Moroccan cities
(Fes, Marrakech, Casablanca, Chefchaouen, Essaouira, Agadir, Rabat, Tangier,
Merzouga, Ouarzazate, Imlil, Dakhla).

If the user only greets or is vague, respond politely and ask what city or vibe they want.

If the user says "random", "surprise me", "go wild", "anything", or
"put everything random", you MUST auto-fill missing details with randomized,
plausible values and proceed WITHOUT asking more questions.

If the user asks for any destination outside Morocco, respond with JSON:
{"answer":"We currently only support trips to Morocco. Pick a Moroccan city and I will build the perfect plan.","intent":"information","followUpQuestion":"Which Moroccan city and what budget should I use?","bookings":[],"travelPlan":null}

For valid Morocco trips extract: origin city+country, destination Moroccan city,
budget in USD (if user provides MAD, convert using ~1 USD = 10 MAD), duration in days.

Return ONLY valid JSON with exactly these keys:
answer (2 sentence friendly summary, warm and natural tone, no robotic phrasing),
intent (one of: booking/information/collaboration/guide/new_trip),
followUpQuestion (optional string),
bookings (3-5 items each with title/type/priceRange/notes),
travelPlan (full object when enough info is provided; otherwise null).
When travelPlan is provided it must include:
- from: origin city and country from user prompt
- to: the Moroccan destination city and country Morocco  
- duration: number of days as integer
- totalBudget: user budget in USD as integer
- totalEstimatedCost: realistic total cost in USD as integer
- budgetMatch: 0-100 score how well plan fits budget
- flights: array of 2-3 realistic options, airlines must be real 
  (Royal Air Maroc, Ryanair, Air Arabia, Transavia, easyJet), 
  prices realistic in USD, isBestValue true on cheapest
- hotels: array of 2-3 real riad or hotel options in the destination city,
  stars 2-5, realistic pricePerNight in USD, 
  totalPrice = pricePerNight * duration,
  amenities array of 3-5 strings,
  isRecommended true on best value
- itinerary: one DayPlan per day, realistic Moroccan activities,
  morning/afternoon/evening each array of 2-3 activity strings with emoji prefix,
  estimatedDailyCost in USD realistic
- budgetBreakdown: flights/hotels/food/activities/transport/misc all in USD,
  must sum close to totalEstimatedCost
- tips: exactly 6 Morocco-specific travel tips 
  (culture, safety, currency MAD, dress code, bargaining, transport)
- packingList: exactly 12 items Morocco-appropriate 
  (weather, modest clothing, medications, etc)
No markdown. No extra keys. Valid JSON only. 
maxOutputTokens must handle full itinerary.`;

    const sanitizedHistory = Array.isArray(history)
      ? history
          .filter((entry) => entry && typeof entry.content === 'string')
          .slice(-6)
          .map((entry) => ({
            role: entry.role === 'user' ? 'user' : 'assistant',
            content: entry.content.trim().slice(0, 800),
          }))
      : [];

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemInstruction },
            ...sanitizedHistory,
            { role: 'user', content: finalPrompt },
          ],
          temperature: 0.3,
          top_p: 0.9,
          max_tokens: 2500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Groq API error: ${response.status} ${errorText}`);
        const inferredIntent = this.inferIntentFromPrompt(cleanPrompt);
        const bookings = this.shouldShowBookings(inferredIntent, cleanPrompt, randomRequested)
          ? this.fallbackBookings(cleanPrompt, inferredIntent)
          : [];
        return {
          answer:
            'I had trouble reaching the booking agent. Here is a quick shortlist to get you started.',
          intent: inferredIntent,
          followUpQuestion: randomRequested
            ? null
            : 'Should I create a new trip from these suggestions?',
          bookings,
          actions: this.buildActions(inferredIntent, bookings, undefined, cleanPrompt),
        };
      }

      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content ?? '';
      const jsonText = this.extractJson(raw) ?? '';

      if (!jsonText) {
        const inferredIntent = this.inferIntentFromPrompt(cleanPrompt);
        const bookings = this.shouldShowBookings(inferredIntent, cleanPrompt, randomRequested)
          ? this.fallbackBookings(cleanPrompt, inferredIntent)
          : [];
        return {
          answer: this.normalizeAnswer(raw, 'Here is a quick plan to get started.'),
          intent: inferredIntent,
          followUpQuestion: randomRequested
            ? null
            : 'Should I create a new trip or keep browsing?',
          bookings,
          actions: this.buildActions(inferredIntent, bookings, undefined, cleanPrompt),
        };
      }

      const parsed = JSON.parse(jsonText) as Partial<HeroAgentResponse>;
      let intent = this.normalizeIntent(parsed.intent);
      const inferredIntent = this.inferIntentFromPrompt(cleanPrompt);
      if (intent === 'information' && inferredIntent !== 'information') {
        intent = inferredIntent;
      }
      if (randomRequested && intent === 'information') {
        intent = 'booking';
      }
      const bookings = this.shouldShowBookings(intent, cleanPrompt, randomRequested)
        ? this.normalizeBookings(parsed.bookings, cleanPrompt, intent)
        : [];
      const travelPlan =
        parsed.travelPlan && typeof parsed.travelPlan === 'object'
          ? (parsed.travelPlan as TravelPlan)
          : undefined;

      const normalizedAnswer = this.normalizeAnswer(
        parsed.answer,
        'Here is a quick plan to get started.',
      );
      const finalAnswer = randomRequested
        ? this.stripTrailingQuestions(normalizedAnswer)
        : normalizedAnswer;

      return {
        answer: finalAnswer,
        intent,
        followUpQuestion: randomRequested
          ? null
          : this.normalizeFollowUp(parsed.followUpQuestion),
        bookings,
        travelPlan,
        actions: this.buildActions(intent, bookings, travelPlan, cleanPrompt),
      };
    } catch (error) {
      this.logger.warn(`Groq API failed: ${String(error)}`);
      const inferredIntent = this.inferIntentFromPrompt(cleanPrompt);
      const bookings = this.shouldShowBookings(inferredIntent, cleanPrompt, randomRequested)
        ? this.fallbackBookings(cleanPrompt, inferredIntent)
        : [];
      return {
        answer:
          'I had trouble generating live recommendations. Here is a quick starter plan.',
        intent: inferredIntent,
        followUpQuestion: randomRequested
          ? null
          : 'Should I create a new trip from these suggestions?',
        bookings,
        actions: this.buildActions(inferredIntent, bookings, undefined, cleanPrompt),
      };
    }
  }
}
