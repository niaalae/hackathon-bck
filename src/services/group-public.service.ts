import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SearchGroupsQueryDto } from '@/public/dto/group/search-groups.query.dto';

@Injectable()
export class GroupPublicService {
  constructor(private readonly prismaService: PrismaService) {}

  async search(query: SearchGroupsQueryDto) {
    const cityInput = query.city.trim();
    if (!cityInput) {
      throw new BadRequestException('city is required');
    }

    const start = query.start ? new Date(query.start) : new Date();
    if (isNaN(start.getTime())) {
      throw new BadRequestException('Invalid start date format. Use ISO 8601.');
    }

    const end = query.end
      ? new Date(query.end)
      : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (isNaN(end.getTime())) {
      throw new BadRequestException('Invalid end date format. Use ISO 8601.');
    }

    if (end <= start) {
      throw new BadRequestException('end must be after start');
    }

    const budget = query.budget;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;

    const groups = await this.prismaService.group.findMany({
      where: {
        city: {
          OR: [
            { id: cityInput },
            { slug: cityInput.toLowerCase() },
            { name: { equals: cityInput, mode: 'insensitive' } },
          ],
        },
        startDate: { lt: end },
        endDate: { gt: start },
        ...(budget !== undefined
          ? {
              budgetMin: { lte: budget },
              budgetMax: { gte: budget },
            }
          : {}),
      },
      include: {
        city: true,
      },
      skip: offset,
      take: limit,
    });

    const queryWindowMs = Math.max(1, end.getTime() - start.getTime());

    const matches = groups
      .map((group) => {
        const overlapStart = Math.max(group.startDate.getTime(), start.getTime());
        const overlapEnd = Math.min(group.endDate.getTime(), end.getTime());
        const overlapMs = Math.max(0, overlapEnd - overlapStart);
        const dateOverlapScore = Math.round((overlapMs / queryWindowMs) * 30);

        const minBudget = Number(group.budgetMin);
        const maxBudget = Number(group.budgetMax);

        let budgetScore = 5;
        if (budget !== undefined) {
          const mid = (minBudget + maxBudget) / 2;
          const halfSpan = Math.max((maxBudget - minBudget) / 2, 1);
          const closeness = Math.max(0, 1 - Math.abs(budget - mid) / halfSpan);
          budgetScore = Math.round(closeness * 10);
        }

        const cityScore = 60;
        const score = cityScore + dateOverlapScore + budgetScore;

        return {
          groupId: group.id,
          cityId: group.cityId,
          cityName: group.city.name,
          startDate: group.startDate,
          endDate: group.endDate,
          capacity: group.capacity,
          budgetMin: minBudget,
          budgetMax: maxBudget,
          score,
          scoreBreakdown: {
            city: cityScore,
            dateOverlap: dateOverlapScore,
            budget: budgetScore,
          },
        };
      })
      .sort((a, b) => b.score - a.score || a.startDate.getTime() - b.startDate.getTime());

    return {
      query: {
        city: cityInput,
        start: start.toISOString(),
        end: end.toISOString(),
        budget: budget ?? null,
        offset,
        limit,
      },
      total: matches.length,
      noMatches: matches.length === 0,
      message: matches.length === 0 ? 'No matching groups found.' : undefined,
      matches,
    };
  }
}
