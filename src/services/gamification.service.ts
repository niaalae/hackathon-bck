import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { normalizeJsonInput } from '@/prisma/prisma-json.util';
import type { GamificationEventType } from '@/public/dto/gamification/gamification-event-type';
import { GAMIFICATION_EVENT_TYPES } from '@/public/dto/gamification/gamification-event-type';
import { TrackGamificationEventDto } from '@/public/dto/gamification/track-gamification-event.dto';
import { UpdateGamificationSettingsDto } from '@/public/dto/gamification/update-gamification-settings.dto';

type PreferencesRecord = Record<string, unknown>;
type QuestStatus = 'completed' | 'in-progress' | 'up-next';

type EventCounters = Record<GamificationEventType, number>;

type TripSnapshot = {
  id: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  city: { name: string } | null;
  items: Array<{ id: string; day: number | null }>;
};

type ActivitySnapshot = { createdAt: Date };

type UserSnapshot = {
  id: string;
  name: string;
  preferences: unknown;
  createdAt: Date;
  tripsOwned: TripSnapshot[];
  bookings: ActivitySnapshot[];
  matches: ActivitySnapshot[];
  swipes: ActivitySnapshot[];
};

type LeaderboardCandidate = {
  id: string;
  name: string;
  preferences: unknown;
  createdAt: Date;
  tripsOwned: TripSnapshot[];
  matches: ActivitySnapshot[];
};

type QuestDefinition = {
  id: string;
  title: string;
  description: string;
  xp: number;
  status: QuestStatus;
  progress: number;
  progressLabel: string;
  href: string;
  actionLabel: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GamificationService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOverview(userId: string) {
    const user = await this.loadUserSnapshot(userId);
    const context = this.buildQuestContext(user.preferences, user.tripsOwned);
    const quests = this.buildQuestDefinitions(user, context);
    const totalXp = this.getTotalXp(quests);
    const leaderboard = await this.buildLeaderboard(user);

    return {
      settings: {
        gamificationEnabled: this.getGamificationEnabled(user.preferences),
      },
      context,
      summary: {
        totalXp,
        rankLabel: this.getRankLabel(totalXp),
        streakDays: this.getStreakDays(user),
        completedQuests: quests.filter((quest) => quest.status === 'completed')
          .length,
        liveQuests: quests.filter((quest) => quest.status === 'in-progress').length,
        nextQuests: quests.filter((quest) => quest.status === 'up-next').length,
        nextUnlock: this.getNextUnlockLabel(quests),
      },
      quests,
      leaderboard,
    };
  }

  async getSettings(userId: string) {
    const user = await this.loadUserSettings(userId);
    return {
      gamificationEnabled: this.getGamificationEnabled(user.preferences),
    };
  }

  async updateSettings(
    userId: string,
    dto: UpdateGamificationSettingsDto,
  ) {
    const user = await this.loadUserSettings(userId);
    const preferences = this.asRecord(user.preferences);
    const accountSettings = this.getAccountSettings(preferences);

    const updatedPreferences = {
      ...preferences,
      accountSettings: {
        ...accountSettings,
        gamificationEnabled: dto.enabled,
      },
    };

    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        preferences: normalizeJsonInput(updatedPreferences),
      },
    });

    return {
      gamificationEnabled: dto.enabled,
      updated: true,
    };
  }

  async trackEvent(
    userId: string,
    dto: TrackGamificationEventDto,
  ) {
    const user = await this.loadUserSettings(userId);
    const preferences = this.asRecord(user.preferences);
    const gamificationState = this.getGamificationState(preferences);
    const counters = this.getEventCounters(preferences);
    const amount = dto.amount ?? 1;
    const now = new Date();

    counters[dto.type] += amount;

    const updatedPreferences = {
      ...preferences,
      gamification: {
        ...gamificationState,
        lastEventAt: now.toISOString(),
        activityDates: this.appendActivityDate(
          this.getActivityDates(preferences),
          now,
        ),
        eventCounters: counters,
      },
    };

    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        preferences: normalizeJsonInput(updatedPreferences),
      },
    });

    return {
      tracked: true,
      type: dto.type,
      amount,
      overview: await this.getOverview(userId),
    };
  }

  private async loadUserSnapshot(userId: string): Promise<UserSnapshot> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        preferences: true,
        createdAt: true,
        tripsOwned: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            city: { select: { name: true } },
            items: { select: { id: true, day: true } },
          },
        },
        bookings: { select: { createdAt: true } },
        matches: { select: { createdAt: true } },
        swipes: { select: { createdAt: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async loadUserSettings(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        preferences: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private buildQuestContext(
    preferencesValue: unknown,
    trips: TripSnapshot[],
  ) {
    const preferences = this.asRecord(preferencesValue);
    const accountSettings = this.getAccountSettings(preferences);
    const latestTrip = trips[0];
    const homeCity =
      typeof accountSettings.homeCity === 'string' &&
      accountSettings.homeCity.trim()
        ? accountSettings.homeCity.trim()
        : null;

    return {
      city: latestTrip?.city?.name ?? homeCity ?? 'Fez',
      durationDays: this.getDurationDays(latestTrip),
    };
  }

  private buildQuestDefinitions(
    user: UserSnapshot | LeaderboardCandidate,
    context: { city: string; durationDays: number },
  ): QuestDefinition[] {
    const preferences = this.asRecord(user.preferences);
    const counters = this.getEventCounters(preferences);
    const likedSpotCount = Math.max(
      counters.LOCAL_SPOT_MATCHED,
      this.getLikedAttractions(preferences).length,
    );

    const totalTripItems = user.tripsOwned.reduce(
      (sum, trip) => sum + trip.items.length,
      0,
    );
    const latestTrip = user.tripsOwned[0];
    const routeProgress = Math.min(
      100,
      Math.max(
        counters.ROUTE_BUILT > 0 ? 100 : 0,
        (user.tripsOwned.length ? 40 : 0) +
          (latestTrip?.city ? 20 : 0) +
          (latestTrip?.startDate || latestTrip?.endDate ? 20 : 0) +
          Math.min(20, totalTripItems * 10),
      ),
    );
    const routeStatus: QuestStatus =
      routeProgress >= 100
        ? 'completed'
        : user.tripsOwned.length > 0
          ? 'in-progress'
          : 'up-next';

    const aiProgress = counters.AI_PROMPT_SENT
      ? 100
      : routeProgress >= 60
        ? 15
        : 0;
    const aiStatus: QuestStatus =
      counters.AI_PROMPT_SENT > 0 ? 'completed' : 'up-next';

    const localMatchProgress = likedSpotCount
      ? Math.min(100, Math.round((likedSpotCount / 3) * 100))
      : aiStatus === 'completed'
        ? 15
        : 0;
    const localMatchStatus: QuestStatus =
      likedSpotCount >= 3
        ? 'completed'
        : likedSpotCount > 0
          ? 'in-progress'
          : 'up-next';

    const groupSignal =
      counters.GROUP_SCOUTED +
      ('matches' in user && user.matches.length > 0 ? 1 : 0);
    const groupProgress = groupSignal
      ? 100
      : localMatchProgress >= 34
        ? 20
        : 0;
    const groupStatus: QuestStatus =
      groupSignal > 0 ? 'completed' : 'up-next';

    const mapProgress = counters.MAP_PREVIEWED
      ? 100
      : routeProgress >= 60
        ? 10
        : 0;
    const mapStatus: QuestStatus =
      counters.MAP_PREVIEWED > 0 ? 'completed' : 'up-next';

    return [
      {
        id: 'route-board',
        title: `Build your ${context.durationDays}-day ${context.city} route`,
        description:
          'Turn your trip idea into a concrete day-by-day route with stops, timing, and a city focus.',
        xp: 80,
        status: routeStatus,
        progress: routeProgress,
        progressLabel:
          routeStatus === 'completed'
            ? 'Route drafted'
            : user.tripsOwned.length
              ? 'Trip shell created'
              : 'Create your first trip',
        href: '/user/dashboard',
        actionLabel: 'Review plan',
      },
      {
        id: 'ai-concierge',
        title: 'Ask the AI concierge',
        description:
          'Send your first prompt to unlock smarter trip ideas and faster planning follow-ups.',
        xp: 55,
        status: aiStatus,
        progress: aiProgress,
        progressLabel:
          aiStatus === 'completed'
            ? 'Prompt sent'
            : routeProgress >= 60
              ? 'Ready for your first prompt'
              : 'Start with your trip route',
        href: '/user/ai',
        actionLabel: 'Open AI',
      },
      {
        id: 'local-match',
        title: 'Match 3 local spots',
        description: `Shortlist cafes, stays, and local addresses in ${context.city} that fit the vibe of the trip.`,
        xp: 70,
        status: localMatchStatus,
        progress: localMatchProgress,
        progressLabel:
          likedSpotCount > 0
            ? `${Math.min(likedSpotCount, 3)} / 3 spots shortlisted`
            : 'Start swiping local spots',
        href: '/user/match',
        actionLabel: 'Open Match',
      },
      {
        id: 'travel-crew',
        title: 'Scout one travel group',
        description:
          'Open a relevant group to check the vibe, timing, and social fit before joining.',
        xp: 60,
        status: groupStatus,
        progress: groupProgress,
        progressLabel:
          groupStatus === 'completed'
            ? 'Group explored'
            : localMatchProgress >= 34
              ? 'Recommended groups are ready'
              : 'Unlock groups with local matches',
        href: '/user/groups',
        actionLabel: 'Open Groups',
      },
      {
        id: 'map-preview',
        title: 'Preview your route on the map',
        description:
          'Connect the main stops on the map to make the itinerary feel real, clear, and navigable.',
        xp: 40,
        status: mapStatus,
        progress: mapProgress,
        progressLabel:
          mapStatus === 'completed'
            ? 'Map preview opened'
            : routeProgress >= 60
              ? 'Ready to unlock'
              : 'Build your route first',
        href: '/user/maps',
        actionLabel: 'Open Maps',
      },
    ];
  }

  private async buildLeaderboard(currentUser: UserSnapshot) {
    const candidates = await this.prismaService.user.findMany({
      take: 50,
      select: {
        id: true,
        name: true,
        preferences: true,
        createdAt: true,
        tripsOwned: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            city: { select: { name: true } },
            items: { select: { id: true, day: true } },
          },
        },
        matches: { select: { createdAt: true } },
      },
    });

    const currentOverviewContext = this.buildQuestContext(
      currentUser.preferences,
      currentUser.tripsOwned,
    );

    const scored = candidates
      .map((candidate) => {
        const context = this.buildQuestContext(
          candidate.preferences,
          candidate.tripsOwned,
        );
        const quests = this.buildQuestDefinitions(candidate, context);
        const xp = this.getTotalXp(quests);

        return {
          id: candidate.id,
          name: candidate.name,
          label: this.getRankLabel(xp),
          xp,
          isCurrentUser: candidate.id === currentUser.id,
          joinedAt: candidate.createdAt,
        };
      })
      .sort(
        (a, b) =>
          b.xp - a.xp ||
          a.joinedAt.getTime() - b.joinedAt.getTime() ||
          a.name.localeCompare(b.name),
      );

    const topThree = scored.slice(0, 3);
    const alreadyVisible = topThree.some((entry) => entry.id === currentUser.id);

    if (alreadyVisible) {
      return topThree.map(({ joinedAt, ...entry }) => entry);
    }

    const currentQuests = this.buildQuestDefinitions(currentUser, currentOverviewContext);
    const currentEntry = {
      id: currentUser.id,
      name: currentUser.name,
      label: this.getRankLabel(this.getTotalXp(currentQuests)),
      xp: this.getTotalXp(currentQuests),
      isCurrentUser: true,
    };

    return [...topThree.slice(0, 2).map(({ joinedAt, ...entry }) => entry), currentEntry];
  }

  private getTotalXp(quests: QuestDefinition[]) {
    return quests
      .filter((quest) => quest.status === 'completed')
      .reduce((sum, quest) => sum + quest.xp, 0);
  }

  private getNextUnlockLabel(quests: QuestDefinition[]) {
    const nextQuest = quests.find((quest) => quest.status !== 'completed');
    if (nextQuest) return nextQuest.title;
    return 'All travel goals completed';
  }

  private getRankLabel(xp: number) {
    if (xp >= 220) return 'Route captain';
    if (xp >= 150) return 'Local scout';
    if (xp >= 80) return 'Explorer I';
    return 'Trip starter';
  }

  private getDurationDays(trip?: TripSnapshot) {
    if (!trip) return 3;

    if (trip.startDate && trip.endDate) {
      const raw = Math.round(
        (trip.endDate.getTime() - trip.startDate.getTime()) / DAY_MS,
      );
      return Math.max(1, raw + 1);
    }

    const plannedDays = trip.items.reduce((maxDay, item) => {
      if (!item.day) return maxDay;
      return Math.max(maxDay, item.day);
    }, 0);

    return plannedDays || 3;
  }

  private getStreakDays(user: UserSnapshot) {
    const preferences = this.asRecord(user.preferences);
    const days = new Set<string>(this.getActivityDates(preferences));

    user.tripsOwned.forEach((trip) => days.add(this.toDayKey(trip.createdAt)));
    user.bookings.forEach((booking) => days.add(this.toDayKey(booking.createdAt)));
    user.matches.forEach((match) => days.add(this.toDayKey(match.createdAt)));
    user.swipes.forEach((swipe) => days.add(this.toDayKey(swipe.createdAt)));

    const orderedDays = Array.from(days).sort((a, b) => b.localeCompare(a));
    if (!orderedDays.length) return 0;

    const today = this.toDayKey(new Date());
    const yesterday = this.shiftDayKey(today, -1);
    if (orderedDays[0] !== today && orderedDays[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < orderedDays.length; i += 1) {
      if (orderedDays[i] !== this.shiftDayKey(orderedDays[i - 1], -1)) break;
      streak += 1;
    }

    return streak;
  }

  private getLikedAttractions(preferences: PreferencesRecord) {
    return Array.isArray(preferences.likedAttractions)
      ? preferences.likedAttractions.filter(
          (value): value is string => typeof value === 'string' && Boolean(value),
        )
      : [];
  }

  private getGamificationEnabled(preferencesValue: unknown) {
    const preferences = this.asRecord(preferencesValue);
    const accountSettings = this.getAccountSettings(preferences);
    const gamification = this.getGamificationState(preferences);

    if (typeof accountSettings.gamificationEnabled === 'boolean') {
      return accountSettings.gamificationEnabled;
    }

    if (typeof gamification.enabled === 'boolean') {
      return gamification.enabled;
    }

    return true;
  }

  private getEventCounters(preferencesValue: unknown): EventCounters {
    const preferences = this.asRecord(preferencesValue);
    const gamification = this.getGamificationState(preferences);
    const rawCounters = this.asRecord(gamification.eventCounters);

    return GAMIFICATION_EVENT_TYPES.reduce((acc, type) => {
      const value = rawCounters[type];
      acc[type] =
        typeof value === 'number' && Number.isFinite(value)
          ? Math.max(0, Math.floor(value))
          : 0;
      return acc;
    }, {} as EventCounters);
  }

  private getActivityDates(preferencesValue: unknown) {
    const preferences = this.asRecord(preferencesValue);
    const gamification = this.getGamificationState(preferences);

    return Array.isArray(gamification.activityDates)
      ? gamification.activityDates.filter(
          (value): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
        )
      : [];
  }

  private appendActivityDate(days: string[], date: Date) {
    const today = this.toDayKey(date);
    return [today, ...days.filter((day) => day !== today)].slice(0, 30);
  }

  private getAccountSettings(preferences: PreferencesRecord) {
    return this.asRecord(preferences.accountSettings);
  }

  private getGamificationState(preferences: PreferencesRecord) {
    return this.asRecord(preferences.gamification);
  }

  private asRecord(value: unknown): PreferencesRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as PreferencesRecord;
  }

  private toDayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private shiftDayKey(dayKey: string, deltaDays: number) {
    const date = new Date(`${dayKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + deltaDays);
    return this.toDayKey(date);
  }
}
