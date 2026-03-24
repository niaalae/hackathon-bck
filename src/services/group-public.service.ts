import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type GroupMembershipRole, type GroupMembershipStatus, type NotificationType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateGroupDto } from '@/public/dto/group/create-group.dto';
import { ReviewGroupMembershipDto } from '@/public/dto/group/review-group-membership.dto';
import { SearchGroupsQueryDto } from '@/public/dto/group/search-groups.query.dto';
import { SearchNotificationsQueryDto } from '@/public/dto/group/search-notifications.query.dto';
import { UpdateGroupDto } from '@/public/dto/group/update-group.dto';
import { UpdateGroupMemberRoleDto } from '@/public/dto/group/update-group-member-role.dto';

const publicGroupUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  preferences: true,
} satisfies Prisma.UserSelect;

const groupMembershipWithUserInclude = {
  user: {
    select: publicGroupUserSelect,
  },
  reviewedBy: {
    select: publicGroupUserSelect,
  },
} satisfies Prisma.GroupMembershipInclude;

const groupDetailInclude = {
  city: true,
  owner: {
    select: publicGroupUserSelect,
  },
  memberships: {
    include: groupMembershipWithUserInclude,
    orderBy: [
      { role: Prisma.SortOrder.asc },
      { requestedAt: Prisma.SortOrder.asc },
    ] satisfies Prisma.GroupMembershipOrderByWithRelationInput[],
  },
  messages: {
    include: {
      user: {
        select: publicGroupUserSelect,
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  },
} satisfies Prisma.GroupInclude;

type GroupMembershipWithUser = Prisma.GroupMembershipGetPayload<{
  include: typeof groupMembershipWithUserInclude;
}>;

type GroupDetail = Prisma.GroupGetPayload<{
  include: typeof groupDetailInclude;
}>;

@Injectable()
export class GroupPublicService {
  constructor(private readonly prismaService: PrismaService) {}

  async search(query: SearchGroupsQueryDto) {
    const cityInput = query.city?.trim();
    const searchInput = query.search?.trim();
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
        ...(searchInput
          ? {
              OR: [
                { title: { contains: searchInput, mode: 'insensitive' } },
                { description: { contains: searchInput, mode: 'insensitive' } },
                { city: { name: { contains: searchInput, mode: 'insensitive' } } },
              ],
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
        owner: {
          select: publicGroupUserSelect,
        },
        memberships: {
          where: { status: 'MEMBER' },
          include: {
            user: {
              select: publicGroupUserSelect,
            },
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
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

        const cityScore = cityInput ? 60 : 40;
        const searchScore =
          searchInput && group.title.toLowerCase().includes(searchInput.toLowerCase()) ? 10 : 0;
        const score = cityScore + dateOverlapScore + budgetScore + searchScore;

        return {
          groupId: group.id,
          cityId: group.cityId,
          cityName: group.city.name,
          title: group.title,
          description: group.description,
          coverImage: group.coverImage,
          owner: group.owner,
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
        search: searchInput ?? null,
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

  async findOne(id: string, viewerUserId?: string) {
    const group = await this.prismaService.group.findUnique({
      where: { id },
      include: groupDetailInclude,
    });

    if (!group) throw new NotFoundException(`Group with ID ${id} not found`);

    const viewerMembership = viewerUserId
      ? group.memberships.find((membership) => membership.userId === viewerUserId)
      : null;
    const canManage = this.canManageMembership(viewerMembership);

    const members = group.memberships.filter((membership) => membership.status === 'MEMBER');
    const pending = group.memberships.filter((membership) => membership.status === 'PENDING');

    return this.serializeGroupDetail(group, {
      includePending: canManage,
      includeMessages: true,
      viewerMembership,
      members,
      pending,
    });
  }

  async create(userId: string, dto: CreateGroupDto) {
    this.validateGroupWindow(dto.startDate, dto.endDate, dto.budgetMin, dto.budgetMax);

    const city = await this.prismaService.city.findUnique({
      where: { id: dto.cityId },
    });
    if (!city) throw new NotFoundException(`City with ID ${dto.cityId} not found`);

    const group = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          cityId: dto.cityId,
          ownerUserId: userId,
          title: dto.title.trim(),
          description: dto.description?.trim(),
          coverImage: dto.coverImage,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          capacity: dto.capacity,
          budgetMin: dto.budgetMin,
          budgetMax: dto.budgetMax,
        },
        include: groupDetailInclude,
      });

      await tx.groupMembership.create({
        data: {
          groupId: created.id,
          userId,
          status: 'MEMBER',
          role: 'OWNER',
          respondedAt: created.createdAt,
          reviewedByUserId: userId,
        },
      });

      return tx.group.findUniqueOrThrow({
        where: { id: created.id },
        include: groupDetailInclude,
      });
    });

    return this.serializeGroupDetail(group, { includePending: true, includeMessages: true });
  }

  async updateGroup(groupId: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.requireGroup(groupId);
    const membership = await this.requireManagerMembership(groupId, userId);
    this.validateGroupWindow(
      dto.startDate ?? group.startDate.toISOString(),
      dto.endDate ?? group.endDate.toISOString(),
      dto.budgetMin ?? Number(group.budgetMin),
      dto.budgetMax ?? Number(group.budgetMax),
    );

    const updated = await this.prismaService.group.update({
      where: { id: groupId },
      data: {
        cityId: dto.cityId,
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        coverImage: dto.coverImage,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        capacity: dto.capacity,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
      },
      include: groupDetailInclude,
    });

    await this.notifyGroupMembersExcept(updated.id, userId, 'GROUP_UPDATED', {
      title: `Group updated: ${updated.title}`,
      message: `${membership.user.name} updated the group details.`,
      data: { groupId: updated.id },
    });

    return this.serializeGroupDetail(updated, { includePending: true, includeMessages: true });
  }

  async deleteGroup(groupId: string, userId: string) {
    const group = await this.requireGroup(groupId);
    await this.requireOwnerMembership(groupId, userId);

    await this.notifyGroupMembersExcept(groupId, userId, 'GROUP_UPDATED', {
      title: `Group closed: ${group.title}`,
      message: 'This group was closed by its owner.',
      data: { groupId },
    });

    await this.prismaService.group.delete({
      where: { id: groupId },
    });

    return { deleted: true, groupId };
  }

  async join(groupId: string, userId: string) {
    const group = await this.requireGroup(groupId);

    if (group.ownerUserId === userId) {
      throw new ConflictException('You already own this group');
    }

    const existing = await this.prismaService.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
      },
    });

    if (existing?.status === 'PENDING') {
      throw new ConflictException('Your request is already pending review');
    }

    if (existing?.status === 'MEMBER') {
      throw new ConflictException('You are already a member of this group');
    }

    const membership = await this.prismaService.groupMembership.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: {
        groupId,
        userId,
        status: 'PENDING',
        role: 'MEMBER',
      },
      update: {
        status: 'PENDING',
        role: 'MEMBER',
        respondedAt: null,
        reviewedByUserId: null,
      },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
      },
    });

    const adminRecipients = await this.listGroupAdminRecipients(groupId);
    await this.createNotifications(
      adminRecipients
        .filter((recipientId) => recipientId !== userId)
        .map((recipientId) => ({
          userId: recipientId,
          actorUserId: userId,
          groupId,
          membershipUserId: userId,
          type: 'GROUP_JOIN_REQUEST' as NotificationType,
          title: `${membership.user.name} requested to join ${group.title}`,
          message: 'Review this request in your group notifications.',
          data: { groupId, membershipUserId: userId },
        })),
    );

    return {
      groupId,
      user: membership.user,
      status: membership.status,
      joined: false,
      message: 'Join request submitted for admin review.',
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

    if (membership.role === 'OWNER') {
      throw new ForbiddenException('The group owner cannot leave using this endpoint');
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
            owner: { select: publicGroupUserSelect },
            memberships: {
              where: { status: 'MEMBER' },
              include: {
                user: {
                  select: publicGroupUserSelect,
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return memberships.map((membership) => ({
      status: membership.status,
      role: membership.role,
      requestedAt: membership.requestedAt,
      respondedAt: membership.respondedAt,
      group: {
        id: membership.group.id,
        title: membership.group.title,
        description: membership.group.description,
        coverImage: membership.group.coverImage,
        owner: membership.group.owner,
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

  async listManagedGroups(userId: string) {
    const memberships = await this.prismaService.groupMembership.findMany({
      where: {
        userId,
        status: 'MEMBER',
        role: { in: ['OWNER', 'ADMIN'] },
      },
      include: {
        group: {
          include: groupDetailInclude,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return memberships.map((membership) =>
      this.serializeGroupDetail(membership.group, {
        includePending: true,
        includeMessages: false,
        viewerMembership: membership,
      }),
    );
  }

  async listIncomingRequests(userId: string) {
    const managedGroups = await this.prismaService.groupMembership.findMany({
      where: {
        userId,
        status: 'MEMBER',
        role: { in: ['OWNER', 'ADMIN'] },
      },
      select: { groupId: true },
    });

    if (managedGroups.length === 0) return [];

    const requests = await this.prismaService.groupMembership.findMany({
      where: {
        groupId: { in: managedGroups.map((item) => item.groupId) },
        status: 'PENDING',
      },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
        group: {
          include: {
            city: true,
            owner: { select: publicGroupUserSelect },
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });

    return requests.map((request) => ({
      groupId: request.groupId,
      status: request.status,
      role: request.role,
      requestedAt: request.requestedAt,
      user: request.user,
      group: {
        id: request.group.id,
        title: request.group.title,
        description: request.group.description,
        coverImage: request.group.coverImage,
        city: request.group.city,
        owner: request.group.owner,
        capacity: request.group.capacity,
      },
    }));
  }

  async reviewMembership(
    groupId: string,
    reviewerId: string,
    targetUserId: string,
    dto: ReviewGroupMembershipDto,
  ) {
    const reviewerMembership = await this.requireManagerMembership(groupId, reviewerId);
    const targetMembership = await this.prismaService.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
        group: {
          include: {
            owner: { select: publicGroupUserSelect },
            memberships: {
              where: { status: 'MEMBER' },
            },
          },
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Group request not found');
    }

    if (targetMembership.status !== 'PENDING') {
      throw new ConflictException('This request has already been reviewed');
    }

    const nextRole: GroupMembershipRole = 'MEMBER';
    const result = await this.prismaService.$transaction(async (tx) => {
      if (dto.status === 'MEMBER') {
        const acceptedCount = await tx.groupMembership.count({
          where: { groupId, status: 'MEMBER' },
        });
        if (acceptedCount >= targetMembership.group.capacity) {
          throw new ConflictException('This group is already full');
        }
      }

      return tx.groupMembership.update({
        where: { groupId_userId: { groupId, userId: targetUserId } },
        data: {
          status: dto.status,
          role: nextRole,
          respondedAt: new Date(),
          reviewedByUserId: reviewerId,
        },
        include: {
          user: {
            select: publicGroupUserSelect,
          },
          group: {
            include: groupDetailInclude,
          },
        },
      });
    });

    const groupTitle = result.group.title;
    const actorName = reviewerMembership.user.name;
    const accepted = dto.status === 'MEMBER';

    await this.createNotifications([
      {
        userId: targetUserId,
        actorUserId: reviewerId,
        groupId,
        membershipUserId: targetUserId,
        type: accepted ? 'GROUP_REQUEST_APPROVED' : 'GROUP_REQUEST_REJECTED',
        title: accepted
          ? `You were accepted into ${groupTitle}`
          : `Your request for ${groupTitle} was declined`,
        message: accepted
          ? `${actorName} approved your join request.`
          : `${actorName} declined your join request.`,
        data: { groupId, membershipUserId: targetUserId, status: dto.status },
      },
      ...(await this.listGroupAdminRecipients(groupId))
        .filter((adminId) => adminId !== reviewerId)
        .map((adminId) => ({
          userId: adminId,
          actorUserId: reviewerId,
          groupId,
          membershipUserId: targetUserId,
          type: 'GROUP_REQUEST_RESOLVED' as NotificationType,
          title: `${result.user.name}'s request was ${accepted ? 'approved' : 'rejected'}`,
          message: `${actorName} already handled this request for ${groupTitle}.`,
          data: { groupId, membershipUserId: targetUserId, status: dto.status },
        })),
    ]);

    return {
      groupId,
      userId: targetUserId,
      status: result.status,
      reviewedBy: reviewerMembership.user,
    };
  }

  async updateMemberRole(
    groupId: string,
    actorUserId: string,
    targetUserId: string,
    dto: UpdateGroupMemberRoleDto,
  ) {
    const actorMembership = await this.requireManagerMembership(groupId, actorUserId);
    const targetMembership = await this.prismaService.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
        group: {
          select: {
            ownerUserId: true,
            title: true,
          },
        },
      },
    });

    if (!targetMembership || targetMembership.status !== 'MEMBER') {
      throw new NotFoundException('Active group member not found');
    }

    if (targetMembership.role === 'OWNER') {
      throw new ForbiddenException('The owner role cannot be changed');
    }

    if (actorMembership.role !== 'OWNER') {
      throw new ForbiddenException('Only the group owner can change admin roles');
    }

    const updated = await this.prismaService.groupMembership.update({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      data: {
        role: dto.role,
        respondedAt: new Date(),
        reviewedByUserId: actorUserId,
      },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
      },
    });

    await this.createNotifications([
      {
        userId: targetUserId,
        actorUserId,
        groupId,
        membershipUserId: targetUserId,
        type: 'GROUP_ROLE_CHANGED',
        title: dto.role === 'ADMIN' ? 'You are now a group admin' : 'Your admin role was removed',
        message:
          dto.role === 'ADMIN'
            ? `${actorMembership.user.name} promoted you to admin.`
            : `${actorMembership.user.name} changed your role back to member.`,
        data: { groupId, role: dto.role },
      },
    ]);

    return {
      groupId,
      userId: targetUserId,
      role: updated.role,
    };
  }

  async removeMember(groupId: string, actorUserId: string, targetUserId: string) {
    const actorMembership = await this.requireManagerMembership(groupId, actorUserId);
    const targetMembership = await this.prismaService.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Group membership not found');
    }

    if (targetMembership.role === 'OWNER') {
      throw new ForbiddenException('The owner cannot be removed');
    }

    if (targetMembership.role === 'ADMIN' && actorMembership.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can remove another admin');
    }

    await this.prismaService.groupMembership.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    await this.createNotifications([
      {
        userId: targetUserId,
        actorUserId,
        groupId,
        membershipUserId: targetUserId,
        type: 'GROUP_MEMBER_REMOVED',
        title: 'You were removed from a group',
        message: `${actorMembership.user.name} removed you from the group.`,
        data: { groupId },
      },
    ]);

    return {
      removed: true,
      groupId,
      userId: targetUserId,
    };
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

  async listNotifications(userId: string, query: SearchNotificationsQueryDto) {
    const notifications = await this.prismaService.notification.findMany({
      where: {
        userId,
        ...(query.unreadOnly ? { readAt: null } : {}),
      },
      include: {
        actor: {
          select: publicGroupUserSelect,
        },
        group: {
          select: {
            id: true,
            title: true,
            coverImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 30,
    });

    return notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      membershipUserId: notification.membershipUserId,
      data: notification.data,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      actor: notification.actor,
      group: notification.group,
    }));
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.prismaService.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prismaService.notification.update({
      where: { id: notificationId },
      data: { readAt: notification.readAt ?? new Date() },
    });
  }

  async markAllNotificationsRead(userId: string) {
    await this.prismaService.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { updated: true };
  }

  private serializeGroupDetail(
    group: GroupDetail,
    options: {
      includePending: boolean;
      includeMessages: boolean;
      viewerMembership?: {
        status: GroupMembershipStatus;
        role: GroupMembershipRole;
      } | null;
      members?: GroupMembershipWithUser[];
      pending?: GroupMembershipWithUser[];
    },
  ) {
    const members =
      options.members ?? group.memberships.filter((membership) => membership.status === 'MEMBER');
    const pending =
      options.pending ?? group.memberships.filter((membership) => membership.status === 'PENDING');

    return {
      id: group.id,
      title: group.title,
      description: group.description,
      coverImage: group.coverImage,
      owner: group.owner,
      city: group.city,
      startDate: group.startDate,
      endDate: group.endDate,
      capacity: group.capacity,
      budgetMin: Number(group.budgetMin),
      budgetMax: Number(group.budgetMax),
      memberCount: members.length,
      availableSpots: Math.max(group.capacity - members.length, 0),
      viewerRole: options.viewerMembership?.role ?? null,
      viewerStatus: options.viewerMembership?.status ?? null,
      members: members.map((membership) => ({
        ...membership.user,
        role: membership.role,
        joinedAt: membership.respondedAt ?? membership.requestedAt,
      })),
      pendingRequests: options.includePending
        ? pending.map((membership) => ({
            ...membership.user,
            role: membership.role,
            requestedAt: membership.requestedAt,
          }))
        : [],
      recentMessages: options.includeMessages
        ? group.messages.map((message) => ({
            id: message.id,
            message: message.message,
            createdAt: message.createdAt,
            user: message.user,
          }))
        : [],
    };
  }

  private validateGroupWindow(
    startInput: string,
    endInput: string,
    budgetMin: number,
    budgetMax: number,
  ) {
    const start = new Date(startInput);
    const end = new Date(endInput);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Group dates must be valid ISO dates');
    }
    if (end <= start) {
      throw new BadRequestException('Group end date must be after start date');
    }
    if (budgetMax < budgetMin) {
      throw new BadRequestException('budgetMax must be greater than or equal to budgetMin');
    }
  }

  private async requireGroup(groupId: string) {
    const group = await this.prismaService.group.findUnique({
      where: { id: groupId },
      include: groupDetailInclude,
    });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }
    return group;
  }

  private async requireManagerMembership(groupId: string, userId: string) {
    const membership = await this.prismaService.groupMembership.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
      },
    });

    if (!membership || membership.status !== 'MEMBER' || !this.canManageMembership(membership)) {
      throw new ForbiddenException('You do not have permission to manage this group');
    }
    return membership;
  }

  private async requireOwnerMembership(groupId: string, userId: string) {
    const membership = await this.prismaService.groupMembership.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
      include: {
        user: {
          select: publicGroupUserSelect,
        },
      },
    });

    if (!membership || membership.status !== 'MEMBER' || membership.role !== 'OWNER') {
      throw new ForbiddenException('Only the group owner can perform this action');
    }
    return membership;
  }

  private canManageMembership(
    membership:
      | {
          status: GroupMembershipStatus;
          role: GroupMembershipRole;
        }
      | null
      | undefined,
  ) {
    return membership?.status === 'MEMBER' && ['OWNER', 'ADMIN'].includes(membership.role);
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
      if (membership.status === 'REJECTED') {
        throw new ForbiddenException('Your join request was declined for this group');
      }

      throw new ForbiddenException('Your join request is still pending for this group');
    }
  }

  private async listGroupAdminRecipients(groupId: string) {
    const admins = await this.prismaService.groupMembership.findMany({
      where: {
        groupId,
        status: 'MEMBER',
        role: { in: ['OWNER', 'ADMIN'] },
      },
      select: { userId: true },
    });
    return admins.map((admin) => admin.userId);
  }

  private async notifyGroupMembersExcept(
    groupId: string,
    actorUserId: string,
    type: NotificationType,
    payload: { title: string; message: string; data?: Prisma.JsonObject },
  ) {
    const memberships = await this.prismaService.groupMembership.findMany({
      where: {
        groupId,
        status: 'MEMBER',
        userId: { not: actorUserId },
      },
      select: { userId: true },
    });

    await this.createNotifications(
      memberships.map((membership) => ({
        userId: membership.userId,
        actorUserId,
        groupId,
        type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
      })),
    );
  }

  private async createNotifications(
    notifications: Array<{
      userId: string;
      actorUserId?: string;
      groupId?: string;
      membershipUserId?: string;
      type: NotificationType;
      title: string;
      message: string;
      data?: Prisma.JsonObject;
    }>,
  ) {
    if (notifications.length === 0) return;
    await this.prismaService.notification.createMany({
      data: notifications.map((notification) => ({
        ...notification,
        actorUserId: notification.actorUserId ?? null,
        groupId: notification.groupId ?? null,
        membershipUserId: notification.membershipUserId ?? null,
        data: notification.data ?? Prisma.JsonNull,
      })),
    });
  }
}
