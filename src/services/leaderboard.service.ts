import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalScore: number;
  totalXp: number;
  level: number;
  groupsCreated: number;
  groupsJoined: number;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the global leaderboard with user rankings
   * @param limit - Number of entries to return (default: 50, max: 100)
   * @param offset - Pagination offset (default: 0)
   * @returns Array of leaderboard entries sorted by score
   */
  async getGlobalLeaderboard(limit: number = 50, offset: number = 0): Promise<LeaderboardEntry[]> {
    try {
      // Validate pagination parameters
      const validLimit = Math.min(Math.max(1, limit), 100);
      const validOffset = Math.max(0, offset);

      // Get users with their group counts
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          _count: {
            select: {
              ownedGroups: true,
              groupMemberships: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: validLimit,
        skip: validOffset,
      });

      // Format the response
      const leaderboardEntries: LeaderboardEntry[] = users.map((user, index) => ({
        rank: validOffset + index + 1,
        userId: user.id,
        userName: user.name || user.email,
        userAvatar: user.avatarUrl,
        totalScore: 0,
        totalXp: 0,
        level: 1,
        groupsCreated: user._count.ownedGroups,
        groupsJoined: user._count.groupMemberships,
      }));

      return leaderboardEntries;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard for a specific city
   * @param cityId - City ID to filter by
   * @param limit - Number of entries to return
   * @param offset - Pagination offset
   * @returns Array of leaderboard entries for the city
   */
  async getCityLeaderboard(
    cityId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<LeaderboardEntry[]> {
    try {
      const validLimit = Math.min(Math.max(1, limit), 100);
      const validOffset = Math.max(0, offset);

      // Get users who have groups in the specified city
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            {
              ownedGroups: {
                some: {
                  cityId: cityId,
                },
              },
            },
            {
              groupMemberships: {
                some: {
                  group: {
                    cityId: cityId,
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          _count: {
            select: {
              ownedGroups: true,
              groupMemberships: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: validLimit,
        skip: validOffset,
      });

      const leaderboardEntries: LeaderboardEntry[] = users.map((user, index) => ({
        rank: validOffset + index + 1,
        userId: user.id,
        userName: user.name || user.email,
        userAvatar: user.avatarUrl,
        totalScore: 0,
        totalXp: 0,
        level: 1,
        groupsCreated: user._count.ownedGroups,
        groupsJoined: user._count.groupMemberships,
      }));

      return leaderboardEntries;
    } catch (error) {
      console.error('Error fetching city leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard for current user's friends
   * @param userId - Current user ID
   * @param limit - Number of entries to return
   * @param offset - Pagination offset
   * @returns Array of leaderboard entries for friends
   */
  async getFriendsLeaderboard(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<LeaderboardEntry[]> {
    try {
      const validLimit = Math.min(Math.max(1, limit), 100);
      const validOffset = Math.max(0, offset);

      // Get users who are in the same groups as the current user
      const friends = await this.prisma.user.findMany({
        where: {
          AND: [
            {
              groupMemberships: {
                some: {
                  group: {
                    memberships: {
                      some: {
                        userId: userId,
                      },
                    },
                  },
                },
              },
            },
            {
              id: {
                not: userId,
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          _count: {
            select: {
              ownedGroups: true,
              groupMemberships: true,
            },
          },
        },
        take: validLimit,
        skip: validOffset,
      });

      const leaderboardEntries: LeaderboardEntry[] = friends.map((user, index) => ({
        rank: validOffset + index + 1,
        userId: user.id,
        userName: user.name || user.email,
        userAvatar: user.avatarUrl,
        totalScore: 0,
        totalXp: 0,
        level: 1,
        groupsCreated: user._count.ownedGroups,
        groupsJoined: user._count.groupMemberships,
      }));

      return leaderboardEntries;
    } catch (error) {
      console.error('Error fetching friends leaderboard:', error);
      throw error;
    }
  }
}
