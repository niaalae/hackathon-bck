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
   * @returns Array of leaderboard entries sorted by score
   */
  async getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
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
        take: 30,
      });

      // Format the response
      const leaderboardEntries: LeaderboardEntry[] = users.map((user, index) => ({
        rank: index + 1,
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
   * @returns Array of leaderboard entries for the city
   */
  async getCityLeaderboard(
    cityId: string,
  ): Promise<LeaderboardEntry[]> {
    try {
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
        take: 30,
      });

      const leaderboardEntries: LeaderboardEntry[] = users.map((user, index) => ({
        rank: index + 1,
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
   * @returns Array of leaderboard entries for friends
   */
  async getFriendsLeaderboard(
    userId: string,
  ): Promise<LeaderboardEntry[]> {
    try {
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
        take: 30,
        skip: 0,
      });

      const leaderboardEntries: LeaderboardEntry[] = friends.map((user, index) => ({
        rank: index + 1,
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
