import { Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import {
  buildHeroPlannerPrompt,
  HeroPlannerRequest,
} from '@/common/hero-planner.config';
import { PrismaService } from '@/prisma/prisma.service';

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
  | 'SHOW_MATCH'
  | 'SHOW_GROUPS'
  | 'REQUEST_GROUP_JOIN'
  | 'SHOW_BOOKINGS'
  | 'SHOW_GUIDES'
  | 'SHOW_MAP'
  | 'SHOW_QUESTS';

type AgentAction = {
  type: AgentActionType;
  payload?: Record<string, unknown>;
};

type PlannerResolvedStop = {
  title: string;
  location: string;
  notes?: string;
  type: string;
  time?: Date;
};

type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type PlannerCityStopPools = {
  morning: string[];
  afternoon: string[];
  evening: string[];
};

const CITY_STOP_POOLS: Record<string, PlannerCityStopPools> = {
  fez: {
    morning: ['Bab Bou Jeloud', 'Bou Inania Madrasa', 'Al-Attarine Madrasa', 'Nejjarine Museum of Wooden Arts & Crafts'],
    afternoon: ['Mosque and University of al-Qarawiyyin', 'Chouara Tannery', 'Place Seffarine', 'Dar Batha Museum'],
    evening: ['Café Clock Fez', 'Borj Nord', 'Jnan Sbil', 'Rcif Market'],
  },
  marrakech: {
    morning: ['Koutoubia Mosque', 'Bahia Palace', 'Jemaa el-Fnaa', 'Le Jardin Secret'],
    afternoon: ['Ben Youssef Madrasa', 'Marrakech Museum', 'Saadian Tombs', 'Majorelle Garden'],
    evening: ['Dar El Bacha Museum', 'Menara Gardens', 'Nomad Marrakech', 'Riad Yima Tea Room'],
  },
  casablanca: {
    morning: ['Hassan II Mosque', 'Place Mohammed V', 'Sacré-Cœur Cathedral', 'Arab League Park'],
    afternoon: ['Habous Quarter', 'Mahkama du Pacha', 'Villa des Arts', 'United Nations Square'],
    evening: ['Corniche Ain Diab', 'Rick’s Café', 'Anfa Place', 'La Sqala'],
  },
  rabat: {
    morning: ['Kasbah of the Udayas', 'Andalusian Gardens', 'Hassan Tower', 'Mausoleum of Mohammed V'],
    afternoon: ['Chellah', 'Mohammed VI Museum of Modern and Contemporary Art', 'Rabat Medina', 'Bab El Had'],
    evening: ['Rabat Ville Railway Station', 'Bouregreg Marina', 'Le Dhow', 'Oudayas Beach'],
  },
  tangier: {
    morning: ['Tangier Kasbah Museum', 'Place du Grand 9 Avril 1947', 'Petit Socco', 'Kasbah Gate'],
    afternoon: ['American Legation Museum', 'Tangier Medina', 'Dar el Makhzen', 'St. Andrew’s Church'],
    evening: ['Cap Spartel', 'Caves of Hercules', 'Tangier Corniche', 'Café Hafa'],
  },
  agadir: {
    morning: ['Agadir Oufella', 'Souk El Had', 'Mohamed V Mosque Agadir', 'Jardin d’Olhao'],
    afternoon: ['Agadir Birds Valley', 'Agadir Marina', 'Kasbat Souss', 'Museum of Amazigh Culture'],
    evening: ['Agadir Beach', 'La Médina d’Agadir', 'Corniche Agadir', 'Taghazout Bay Viewpoint'],
  },
  essaouira: {
    morning: ['Essaouira Medina', 'Skala de la Ville', 'Port of Essaouira', 'Bab Doukkala Essaouira'],
    afternoon: ['Sidi Mohammed Ben Abdallah Museum', 'Mellah of Essaouira', 'Place Moulay Hassan', 'Ramparts of Essaouira'],
    evening: ['Taros Essaouira', 'Essaouira Beach', 'Ocean Vagabond Essaouira', 'Café de France Essaouira'],
  },
  chefchaouen: {
    morning: ['Place Outa El Hammam', 'Kasbah Museum Chefchaouen', 'Grand Mosque Chefchaouen', 'Ras El Maa'],
    afternoon: ['Chefchaouen Medina', 'Spanish Mosque', 'Bab El Ain', 'Souika Chefchaouen'],
    evening: ['Ras El Maa Waterfall', 'Cafe Clock Chefchaouen', 'Plaza Uta el-Hammam', 'Sunset viewpoint Chefchaouen'],
  },
  ouarzazate: {
    morning: ['Taourirt Kasbah', 'Cinema Museum Ouarzazate', 'Kasbah of Tifoultoute', 'Atlas Film Studios'],
    afternoon: ['Ait Benhaddou', 'CLA Studios', 'Oasis Fint', 'Ksar of Ait Ben Haddou'],
    evening: ['Ouarzazate city viewpoint', 'Chez Dimitri', 'Place Al Mouahidine', 'Kasbah Taourirt gardens'],
  },
  meknes: {
    morning: ['Bab Mansour', 'Lahdim Square', 'Mausoleum of Moulay Ismail', 'Koubbat as-Sufara'],
    afternoon: ['Dar Jamai Museum', 'Bou Inania Madrasa Meknes', 'Royal Stables of Meknes', 'Heri es-Souani'],
    evening: ['Sahrij Swani', 'Meknes Medina', 'Place El Hedim', 'Café Opera Meknes'],
  },
  merzouga: {
    morning: ['Merzouga Desert', 'Lac Dayet Srij', 'Merzouga Centre', 'Erg Chebbi dunes viewpoint'],
    afternoon: ['Khamlia Village', 'Maison Chez Nous Merzouga', 'Nomad Families Merzouga', 'Hassilabied oasis'],
    evening: ['Merzouga Sunset Point', 'Erg Chebbi camel station', 'Merzouga Camp', 'Ksar Merzouga'],
  },
  dakhla: {
    morning: ['Dakhla Lagoon', 'Dakhla Seafront', 'Dakhla city center', 'Moussem Dakhla square'],
    afternoon: ['PK25 Dakhla', 'Dragon Island viewpoint', 'White Dune Dakhla', 'Dakhla conference center'],
    evening: ['Dakhla waterfront', 'Kite beach Dakhla', 'Café Restaurant Sahara', 'Dakhla sunset point'],
  },
  imlil: {
    morning: ['Imlil village center', 'Kasbah du Toubkal', 'Imlil waterfall', 'Aroumd trailhead'],
    afternoon: ['Aroumd village', 'Toubkal National Park viewpoint', 'Armed valley café', 'Imlil walnut grove'],
    evening: ['Imlil mountain viewpoint', 'Riad Atlas Toubkal', 'Imlil riverside walk', 'Local tea terrace Imlil'],
  },
};

@Injectable()
export class HeroAgentService {
  private readonly logger = new Logger(HeroAgentService.name);
  constructor(private readonly prismaService: PrismaService) {}

  private get apiKey() {
    return process.env.GROQ_API_KEY ?? '';
  }

  private get model() {
    return process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';
  }
  private readonly endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly googlePlacesEndpoint = 'https://places.googleapis.com/v1/places:searchText';
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

  private normalizePlannerCityKey(city: string) {
    const clean = city.trim().toLowerCase();
    const aliasMap: Record<string, string> = {
      fes: 'fez',
      fez: 'fez',
      marrakesh: 'marrakech',
      tanger: 'tangier',
    };
    return aliasMap[clean] ?? clean;
  }

  private getPlannerCityStopPools(city: string): PlannerCityStopPools {
    return (
      CITY_STOP_POOLS[this.normalizePlannerCityKey(city)] ?? {
        morning: [`${city} Medina`, `${city} Main Square`, `${city} historic gate`, `${city} central market`],
        afternoon: [`${city} museum`, `${city} main landmark`, `${city} old town viewpoint`, `${city} artisan quarter`],
        evening: [`${city} rooftop café`, `${city} promenade`, `${city} sunset viewpoint`, `${city} central boulevard`],
      }
    );
  }

  private isGenericPlannerEntry(text?: string | null) {
    if (!text) return true;
    const clean = text
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (!clean) return true;
    const genericPatterns = [
      'explore',
      'discover',
      'local highlights',
      'local discoveries',
      'lunch',
      'dinner',
      'breakfast',
      'evening',
      'morning',
      'afternoon',
      'stroll',
      'slow evening',
      'heritage quarter',
      'historic quarter',
      'relaxed local',
      'signature landmarks',
      'popular highlights',
      'wrap up',
    ];
    return genericPatterns.some((pattern) => clean.includes(pattern));
  }

  private getPlannerSectionFallback(
    city: string,
    section: keyof PlannerCityStopPools,
    dayIndex: number,
  ) {
    const pool = this.getPlannerCityStopPools(city)[section];
    const total = Math.max(1, pool.length);
    const start = (dayIndex * 2) % total;
    return [pool[start], pool[(start + 1) % total]];
  }

  private normalizePlannerEntries(
    city: string,
    entries: string[] | undefined,
    section: keyof PlannerCityStopPools,
    dayIndex: number,
  ) {
    const normalizedEntries = Array.isArray(entries)
      ? entries
          .map((entry) => this.normalizePlannerStopTitle(entry))
          .filter(Boolean)
      : [];

    const usableEntries = normalizedEntries.filter(
      (entry) => !this.isGenericPlannerEntry(entry),
    );

    if (usableEntries.length >= 2) {
      return usableEntries.slice(0, 3);
    }

    const fallback = this.getPlannerSectionFallback(city, section, dayIndex);
    const merged = [...usableEntries, ...fallback];
    return Array.from(new Set(merged)).slice(0, 3);
  }

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
    return /(trip|travel|plan|booking|book|flight|hotel|riad|stay|itinerary|route|map|guide|tour|visit|vacation|group|collab|match|agenda|history|section|open)/i.test(
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
    const isMatchPrompt = !!prompt && /(match|matching|swipe|people like me|similar travelers|find people)/i.test(prompt);
    const normalizedPrompt = prompt?.toLowerCase() ?? '';

    if (travelPlan) {
      actions.push({ type: 'SHOW_TRIPS', payload: { travelPlan } });
    }

    if (normalizedPrompt && /(agenda|trip plan|my trip|my agenda|history section|open history|show history)/i.test(normalizedPrompt)) {
      actions.push({ type: 'SHOW_TRIPS' });
    }

    if (normalizedPrompt && /(match|matching|swipe|people like me|find people|open match)/i.test(normalizedPrompt)) {
      actions.push({ type: 'SHOW_MATCH' });
    }

    if (normalizedPrompt && /(group|groups|collab|collaborate|open groups)/i.test(normalizedPrompt)) {
      actions.push({ type: 'SHOW_GROUPS' });
    }

    if (normalizedPrompt && /(map|route|navigation|navigate|open map)/i.test(normalizedPrompt)) {
      actions.push({ type: 'SHOW_MAP' });
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
      actions.push({ type: isMatchPrompt ? 'SHOW_MATCH' : 'SHOW_GROUPS' });
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

    return actions.filter((action, index, list) =>
      list.findIndex((candidate) => candidate.type === action.type) === index,
    );
  }

  private extractPromptCity(prompt: string) {
    return this.moroccoCities.find((city) =>
      new RegExp(`\\b${city}\\b`, 'i').test(prompt),
    );
  }

  private wantsGroupJoin(prompt: string) {
    return /(join|request to join|send (a )?join request|apply to join|join this group|join that group)/i.test(
      prompt,
    );
  }

  private async findJoinableGroup(prompt: string) {
    if (!this.wantsGroupJoin(prompt)) return null;

    const city = this.extractPromptCity(prompt);
    const searchPrompt = prompt.trim();

    const groups = await this.prismaService.group.findMany({
      where: {
        startDate: { gt: new Date() },
        ...(city
          ? {
              city: {
                name: { contains: city, mode: 'insensitive' as const },
              },
            }
          : {}),
        OR: [
          { title: { contains: searchPrompt, mode: 'insensitive' as const } },
          { description: { contains: searchPrompt, mode: 'insensitive' as const } },
          ...(city
            ? [{ city: { name: { contains: city, mode: 'insensitive' as const } } }]
            : []),
        ],
      },
      include: {
        city: {
          select: { id: true, name: true, slug: true },
        },
        memberships: {
          where: { status: 'MEMBER' },
          select: { userId: true },
        },
      },
      orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
      take: 5,
    });

    const candidate = groups.find((group) => group.memberships.length < group.capacity);
    if (!candidate) return null;

    return {
      groupId: candidate.id,
      title: candidate.title,
      cityId: candidate.cityId,
      cityName: candidate.city.name,
    };
  }

  private async buildActionsForPrompt(
    intent: HeroAgentResponse['intent'],
    bookings: BookingSuggestion[],
    travelPlan: TravelPlan | undefined,
    prompt: string,
  ) {
    const actions = this.buildActions(intent, bookings, travelPlan, prompt);
    const joinCandidate = await this.findJoinableGroup(prompt);

    if (joinCandidate) {
      actions.unshift({
        type: 'REQUEST_GROUP_JOIN',
        payload: joinCandidate,
      });
      if (!actions.some((action) => action.type === 'SHOW_GROUPS')) {
        actions.push({
          type: 'SHOW_GROUPS',
          payload: {
            city: joinCandidate.cityName,
          },
        });
      }
    }

    return actions;
  }

  private buildPlannerAcknowledgement(
    request: HeroPlannerRequest,
    response: HeroAgentResponse,
  ): string {
    const duration = Math.max(1, Number(request.durationDays ?? 5));
    const destination = request.city?.trim() || response.travelPlan?.to?.city || 'your destination';
    const budgetLine =
      typeof request.budgetDh === 'number' && Number.isFinite(request.budgetDh) && request.budgetDh > 0
        ? ` around ${Math.round(request.budgetDh)} MAD`
        : '';

    if (response.travelPlan) {
      return `Got it. I mapped a ${duration}-day ${destination} trip${budgetLine} and prepared the route for you.`;
    }

    return `Got it. I saved your ${destination} trip brief${budgetLine} and prepared the next planning step for you.`;
  }

  private normalizePlannerTravelPlan(
    request: HeroPlannerRequest,
    travelPlan: TravelPlan,
  ): TravelPlan {
    const forcedCity = request.city.trim();
    const forcedDuration = Math.max(1, Number(request.durationDays ?? travelPlan.duration ?? 5));
    const forcedBudgetMad =
      typeof request.budgetDh === 'number' && Number.isFinite(request.budgetDh) && request.budgetDh > 0
        ? Math.round(request.budgetDh)
        : null;
    const forcedBudgetUsd = forcedBudgetMad ? Math.max(50, Math.round(forcedBudgetMad / 10)) : null;
    const forcePlannerCity = (value?: string | null) => {
      if (!value) return value ?? '';

      return [...this.moroccoCities, 'Fez', 'Meknes'].reduce((next, city) => {
        if (city.toLowerCase() === forcedCity.toLowerCase()) return next;
        return next.replace(new RegExp(`\\b${city}\\b`, 'gi'), forcedCity);
      }, value);
    };

    const normalizedItinerary = Array.from({ length: forcedDuration }).map((_, index) => {
      const sourceDay = travelPlan.itinerary?.[index] ?? travelPlan.itinerary?.[travelPlan.itinerary.length - 1];
      return {
        day: index + 1,
        theme: forcePlannerCity(sourceDay?.theme) || `Day ${index + 1} in ${forcedCity}`,
        morning: this.normalizePlannerEntries(
          forcedCity,
          sourceDay?.morning?.map((entry) => forcePlannerCity(entry)),
          'morning',
          index,
        ),
        afternoon: this.normalizePlannerEntries(
          forcedCity,
          sourceDay?.afternoon?.map((entry) => forcePlannerCity(entry)),
          'afternoon',
          index,
        ),
        evening: this.normalizePlannerEntries(
          forcedCity,
          sourceDay?.evening?.map((entry) => forcePlannerCity(entry)),
          'evening',
          index,
        ),
        estimatedDailyCost:
          sourceDay?.estimatedDailyCost ??
          Math.max(45, Math.round((forcedBudgetUsd ?? travelPlan.totalEstimatedCost ?? 300) / forcedDuration)),
      };
    });

    return {
      ...travelPlan,
      to: {
        city: forcedCity,
        country: 'Morocco',
      },
      duration: forcedDuration,
      totalBudget: forcedBudgetUsd ?? travelPlan.totalBudget,
      hotels: Array.isArray(travelPlan.hotels)
        ? travelPlan.hotels.map((hotel) => ({
            ...hotel,
            name: forcePlannerCity(hotel.name),
            location: forcePlannerCity(hotel.location) || forcedCity,
            totalPrice: hotel.pricePerNight * forcedDuration,
          }))
        : [],
      itinerary: normalizedItinerary,
    };
  }

  private buildFallbackPlannerTravelPlan(
    request: HeroPlannerRequest,
  ): TravelPlan {
    const duration = Math.max(1, Number(request.durationDays ?? 5));
    const totalBudgetMad =
      typeof request.budgetDh === 'number' && Number.isFinite(request.budgetDh)
        ? Math.round(request.budgetDh)
        : duration * 1200;
    const totalBudgetUsd = Math.max(200, Math.round(totalBudgetMad / 10));
    const itinerary: DayPlan[] = Array.from({ length: duration }).map((_, index) => {
      return {
        day: index + 1,
        theme: `Day ${index + 1} in ${request.city}`,
        morning: this.getPlannerSectionFallback(request.city, 'morning', index),
        afternoon: this.getPlannerSectionFallback(request.city, 'afternoon', index),
        evening: this.getPlannerSectionFallback(request.city, 'evening', index),
        estimatedDailyCost: Math.max(45, Math.round(totalBudgetUsd / duration)),
      };
    });

    const hotelNightly = Math.max(45, Math.round((totalBudgetUsd * 0.35) / duration));

    return {
      from: { city: 'Flexible', country: 'Unknown' },
      to: { city: request.city, country: 'Morocco' },
      duration,
      totalBudget: totalBudgetUsd,
      totalEstimatedCost: Math.max(180, Math.round(totalBudgetUsd * 0.92)),
      budgetMatch: 92,
      flights: [],
      hotels: [
        {
          name: `Riad stay in ${request.city}`,
          stars: 4,
          pricePerNight: hotelNightly,
          totalPrice: hotelNightly * duration,
          location: `${request.city}, Morocco`,
          rating: 4.5,
          amenities: ['Breakfast', 'Central location', 'Free Wi-Fi'],
          isRecommended: true,
        },
      ],
      itinerary,
      budgetBreakdown: {
        flights: 0,
        hotels: hotelNightly * duration,
        food: Math.round(totalBudgetUsd * 0.24),
        activities: Math.round(totalBudgetUsd * 0.18),
        transport: Math.round(totalBudgetUsd * 0.08),
        misc: Math.round(totalBudgetUsd * 0.07),
      },
      tips: [
        'Carry small MAD cash for souks and quick stops.',
        'Dress comfortably and modestly for long walking days.',
        'Start early for popular landmarks and medina routes.',
        'Use bottled water during long sightseeing days.',
        'Keep one flexible slot each day for spontaneous finds.',
        'Confirm opening hours the day before major stops.',
      ],
      packingList: [
        'Comfortable walking shoes',
        'Light layers',
        'Phone charger',
        'Power bank',
        'Water bottle',
        'Sunscreen',
        'Sunglasses',
        'Small day bag',
        'Travel documents',
        'Medication',
        'Hat or cap',
        'Cash in MAD',
      ],
    };
  }

  private sanitizePlannerBookings(
    request: HeroPlannerRequest,
    response: HeroAgentResponse,
  ): BookingSuggestion[] {
    const city = request.city?.trim() || response.travelPlan?.to?.city || 'your trip';
    const fallback: BookingSuggestion[] = [
      {
        title: `Flight options for ${city}`,
        type: 'flight',
        priceRange: 'Budget to mid-range',
        notes: 'Shortlisted for the trip brief you approved.',
      },
      {
        title: `Stay shortlist in ${city}`,
        type: 'stay',
        priceRange: 'Mid-range',
        notes: 'Central picks aligned with your trip vibe.',
      },
      {
        title: `Activity picks in ${city}`,
        type: 'activity',
        priceRange: 'From $',
        notes: 'Matched to your route and interests.',
      },
    ];

    if (!Array.isArray(response.bookings) || response.bookings.length === 0) {
      return fallback;
    }

    return response.bookings.map((booking, index) => {
      if (
        booking.title.includes('You are preparing an internal travel-planning br') ||
        booking.title.toLowerCase().includes('internal travel-planning')
      ) {
        return fallback[index] ?? fallback[fallback.length - 1];
      }

      return booking;
    });
  }

  private buildPlannerTripDescription(
    request: HeroPlannerRequest,
    response: HeroAgentResponse,
  ) {
    const city = response.travelPlan?.to?.city || request.city;
    const duration = response.travelPlan?.duration || request.durationDays || 5;
    const budget =
      typeof request.budgetDh === 'number' && Number.isFinite(request.budgetDh)
        ? ` around ${Math.round(request.budgetDh)} MAD`
        : '';
    const interests = request.interests?.length
      ? request.interests.slice(0, 3).join(', ')
      : 'local highlights';

    return `${duration}-day ${city} route curated for ${interests}${budget}.`;
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

  private get googlePlacesApiKey() {
    return (
      process.env.GOOGLE_PLACES_API_KEY ??
      process.env.VITE_GOOGLE_PLACES_API_KEY ??
      ''
    );
  }

  private normalizePlannerStopTitle(text: string) {
    return text
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async resolveCityId(cityName: string) {
    const cities = await this.prismaService.city.findMany({
      select: { id: true, name: true, slug: true },
    });
    const aliasMap: Record<string, string> = {
      fes: 'fez',
      fez: 'fez',
      marrakesh: 'marrakech',
      tanger: 'tangier',
    };
    const normalizeLookup = (value: string) =>
      aliasMap[value.trim().toLowerCase()] ?? value.trim().toLowerCase();
    const target = normalizeLookup(cityName);

    const match = cities.find((city) => {
      return (
        normalizeLookup(city.name) === target ||
        normalizeLookup(city.slug.replace(/\s+/g, '-')) === target.replace(/\s+/g, '-')
      );
    });

    return match?.id;
  }

  private async searchPlannerPlace(
    query: string,
  ): Promise<PlannerResolvedStop | null> {
    if (!this.googlePlacesApiKey) return null;

    try {
      const response = await fetch(this.googlePlacesEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.googlePlacesApiKey,
          'X-Goog-FieldMask':
            'places.displayName,places.formattedAddress,places.primaryTypeDisplayName',
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'en',
          regionCode: 'MA',
          maxResultCount: 1,
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      const place = data?.places?.[0];
      if (!place?.displayName?.text) return null;

      return {
        title: String(place.displayName.text),
        location: String(place.formattedAddress ?? query),
        notes: undefined,
        type: String(place.primaryTypeDisplayName?.text ?? 'activity'),
      };
    } catch {
      return null;
    }
  }

  private async buildTripItemsFromTravelPlan(
    request: HeroPlannerRequest,
    travelPlan: TravelPlan,
  ) {
    const items: Array<{
      day?: number;
      title: string;
      location?: string;
      time?: Date;
      notes?: string;
      type?: string;
    }> = [];

    for (const day of travelPlan.itinerary ?? []) {
      const sections: Array<{ label: string; entries: string[] }> = [
        { label: 'Morning', entries: day.morning ?? [] },
        { label: 'Afternoon', entries: day.afternoon ?? [] },
        { label: 'Evening', entries: day.evening ?? [] },
      ];
      const sectionHours: Record<string, number> = {
        Morning: 9,
        Afternoon: 14,
        Evening: 19,
      };

      for (const section of sections) {
        for (const [entryIndex, entry] of section.entries.entries()) {
          const cleanedTitle = this.normalizePlannerStopTitle(entry);
          const fallbackTitle =
            this.getPlannerSectionFallback(
              request.city,
              section.label.toLowerCase() as keyof PlannerCityStopPools,
              Math.max(0, day.day - 1),
            )[entryIndex % 2];
          const queryTitle = this.isGenericPlannerEntry(cleanedTitle)
            ? fallbackTitle
            : cleanedTitle;
          const resolved =
            (await this.searchPlannerPlace(
              `${queryTitle}, ${request.city}, Morocco`,
            )) ?? null;
          const stopTime = new Date();
          stopTime.setHours(sectionHours[section.label] ?? 9, entryIndex * 15, 0, 0);
          stopTime.setDate(stopTime.getDate() + Math.max(0, day.day - 1));

          items.push({
            day: day.day,
            title: resolved?.title || queryTitle,
            location: resolved?.location || `${request.city}, Morocco`,
            notes: `${section.label} · ${day.theme}`,
            type: resolved?.type || 'activity',
            time: stopTime,
          });
        }
      }
    }

    return items;
  }

  private async persistPlannerTrip(
    request: HeroPlannerRequest,
    response: HeroAgentResponse,
  ) {
    try {
      if (!request.ownerUserId || !response.travelPlan) return null;

      const owner = await this.prismaService.user.findUnique({
        where: { id: request.ownerUserId },
        select: { id: true },
      });
      if (!owner) return null;

      const cityId = await this.resolveCityId(
        response.travelPlan.to?.city || request.city,
      );
      const items = await this.buildTripItemsFromTravelPlan(
        request,
        response.travelPlan,
      );

      const trip = await this.prismaService.trip.create({
        data: {
          ownerUserId: request.ownerUserId,
          title: `${response.travelPlan.to.city} trip`,
          description: this.buildPlannerTripDescription(request, response),
          cityId,
          budgetTotal:
            typeof request.budgetDh === 'number'
              ? Number(request.budgetDh)
              : response.travelPlan.totalBudget,
          currency: typeof request.budgetDh === 'number' ? 'MAD' : 'USD',
        },
      });

      if (items.length) {
        for (const item of items) {
          await this.prismaService.tripItem.create({
            data: {
              tripId: trip.id,
              day: item.day,
              title: item.title,
              location: item.location,
              time: item.time,
              notes: item.notes,
              type: item.type,
            },
          });
        }
      }

      return await this.prismaService.trip.findUnique({
        where: { id: trip.id },
        include: {
          city: true,
          items: true,
        },
      });
    } catch (error) {
      this.logger.warn(`Planner trip persistence failed: ${String(error)}`);
      return null;
    }
  }

  async generateHeroReply(
    prompt: string,
    history?: HistoryMessage[],
  ): Promise<HeroAgentResponse> {

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
        actions: await this.buildActionsForPrompt('information', bookings, undefined, cleanPrompt),
      };
    }

    if (!process.env.GROQ_API_KEY) {
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
        actions: await this.buildActionsForPrompt(inferredIntent, bookings, undefined, cleanPrompt),
      };
    }

    const systemInstruction = `You are Trippple, a Morocco travel specialist AI. Speak naturally and warmly.
Your job is to classify the user's intent and guide them to the right flow.
Intents: booking, information, collaboration, guide, new_trip.
Always use the conversation history. If the user answers a previous question, do NOT ask the same thing again.
You can help with direct app actions too. If the user asks to open agenda/history, matching, groups, bookings, or the map, answer briefly and let the action routing handle it.
If the user asks to join a group and there is a suitable group, prefer helping them send the join request.

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
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
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
          actions: await this.buildActionsForPrompt(inferredIntent, bookings, undefined, cleanPrompt),
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
          actions: await this.buildActionsForPrompt(inferredIntent, bookings, undefined, cleanPrompt),
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
        actions: await this.buildActionsForPrompt(intent, bookings, travelPlan, cleanPrompt),
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
        actions: await this.buildActionsForPrompt(inferredIntent, bookings, undefined, cleanPrompt),
      };
    }
  }

  async generateHeroReplyFromPlanner(
    request: HeroPlannerRequest,
  ): Promise<HeroAgentResponse> {
    const plannerPrompt = buildHeroPlannerPrompt(request);
    const response = await this.generateHeroReply(plannerPrompt);
    const normalizedResponse: HeroAgentResponse = {
      ...response,
      travelPlan: this.normalizePlannerTravelPlan(
        request,
        response.travelPlan ?? this.buildFallbackPlannerTravelPlan(request),
      ),
    };
    const bookings = this.sanitizePlannerBookings(request, normalizedResponse);
    const persistedTrip = await this.persistPlannerTrip(
      request,
      normalizedResponse,
    );
    const baseActions = this.buildActions(
      normalizedResponse.intent,
      bookings,
      normalizedResponse.travelPlan,
      request.city,
    );
    const actions = persistedTrip
      ? baseActions.map((action) =>
          action.type === 'SHOW_TRIPS' || action.type === 'SHOW_MAP'
            ? {
                ...action,
                payload: {
                  ...action.payload,
                  tripId: persistedTrip.id,
                },
              }
            : action,
        )
      : baseActions;
    if (
      persistedTrip &&
      !actions.some((action) => action.type === 'SHOW_MAP')
    ) {
      actions.unshift({
        type: 'SHOW_MAP',
        payload: {
          tripId: persistedTrip.id,
        },
      });
    }

    return {
      ...normalizedResponse,
      answer: this.buildPlannerAcknowledgement(request, normalizedResponse),
      followUpQuestion: null,
      bookings,
      actions,
    };
  }
}
