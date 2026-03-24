import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SearchGroupsQueryDto } from '@/public/dto/group/search-groups.query.dto';

const publicGroupUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  preferences: true,
} as const;

@Injectable()
export class GroupPublicService {
  constructor(private readonly prismaService: PrismaService) {}

  async search(query: SearchGroupsQueryDto) {
    const cityInput = query.city?.trim();

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
        ...(cityInput
          ? {
              city: {
                OR: [
                  { id: cityInput },
                  { slug: cityInput.toLowerCase() },
                  { name: { equals: cityInput, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
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
        memberships: {
          where: { status: 'MEMBER' },
        },
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
          memberCount: group.memberships.length,
          availableSpots: Math.max(group.capacity - group.memberships.length, 0),
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
        city: cityInput ?? null,
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

  async findOne(id: string) {
    const group = await this.prismaService.group.findUnique({
      where: { id },
      include: {
        city: true,
        memberships: {
          include: {
            user: {
              select: publicGroupUserSelect,
            },
          },
          orderBy: [{ status: 'asc' }, { requestedAt: 'asc' }],
        },
        messages: {
          include: {
            user: {
              select: publicGroupUserSelect,
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!group) throw new NotFoundException(`Group with ID ${id} not found`);

    const members = group.memberships.filter(
      (membership) => membership.status === 'MEMBER',
    );
    const pending = group.memberships.filter(
      (membership) => membership.status === 'PENDING',
    );

    return {
      id: group.id,
      city: group.city,
      startDate: group.startDate,
      endDate: group.endDate,
      capacity: group.capacity,
      budgetMin: Number(group.budgetMin),
      budgetMax: Number(group.budgetMax),
      memberCount: members.length,
      availableSpots: Math.max(group.capacity - members.length, 0),
      members: members.map((membership) => ({
        ...membership.user,
        joinedAt: membership.requestedAt,
      })),
      pendingRequests: pending.map((membership) => ({
        ...membership.user,
        requestedAt: membership.requestedAt,
      })),
      recentMessages: group.messages.map((message) => ({
        id: message.id,
        message: message.message,
        createdAt: message.createdAt,
        user: message.user,
      })),
    };
  }

  async join(groupId: string, userId: string) {
    const group = await this.prismaService.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { status: 'MEMBER' },
        },
      },
    });

    if (!group) throw new NotFoundException(`Group with ID ${groupId} not found`);

    const existing = await this.prismaService.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (existing?.status === 'MEMBER') {
      throw new ConflictException('You are already a member of this group');
    }

    const nextStatus =
      group.memberships.length < group.capacity ? 'MEMBER' : 'PENDING';

    const membership = await this.prismaService.groupMembership.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      create: {
        groupId,
        userId,
        status: nextStatus,
      },
      update: {
        status: nextStatus,
      },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
      },
    });

    return {
      groupId,
      user: membership.user,
      status: membership.status,
      joined: membership.status === 'MEMBER',
      message:
        membership.status === 'MEMBER'
          ? 'Joined group successfully.'
          : 'Join request is pending.',
    };
  }

  async cancelJoin(groupId: string, userId: string) {
    const membership = await this.prismaService.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('No group membership or join request found');
    }

    await this.prismaService.groupMembership.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return {
      groupId,
      canceled: true,
      previousStatus: membership.status,
    };
  }

  async listUserGroups(userId: string) {
    const memberships = await this.prismaService.groupMembership.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            city: true,
            memberships: {
              where: { status: 'MEMBER' },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return memberships.map((membership) => ({
      status: membership.status,
      requestedAt: membership.requestedAt,
      group: {
        id: membership.group.id,
        city: membership.group.city,
        startDate: membership.group.startDate,
        endDate: membership.group.endDate,
        capacity: membership.group.capacity,
        budgetMin: Number(membership.group.budgetMin),
        budgetMax: Number(membership.group.budgetMax),
        memberCount: membership.group.memberships.length,
        availableSpots: Math.max(
          membership.group.capacity - membership.group.memberships.length,
          0,
        ),
      },
    }));
  }

  async listMessages(groupId: string, userId: string) {
    await this.assertMember(groupId, userId);

    const messages = await this.prismaService.groupMessage.findMany({
      where: { groupId },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      groupId,
      total: messages.length,
      messages: messages.map((message) => ({
        id: message.id,
        message: message.message,
        createdAt: message.createdAt,
        user: message.user,
      })),
    };
  }

  async sendMessage(groupId: string, userId: string, message: string) {
    await this.assertMember(groupId, userId);

    const created = await this.prismaService.groupMessage.create({
      data: {
        groupId,
        userId,
        message: message.trim(),
      },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
      },
    });

    return {
      id: created.id,
      groupId: created.groupId,
      message: created.message,
      createdAt: created.createdAt,
      user: created.user,
    };
  }

  private async assertMember(groupId: string, userId: string) {
    const membership = await this.prismaService.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Join the group before accessing group chat');
    }

    if (membership.status !== 'MEMBER') {
      throw new ForbiddenException(
        'Your join request is still pending for this group',
      );
    }
  }
}
