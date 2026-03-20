import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from '@/admin/dto/user/create-user.dto';
import { UpdateUserDto } from '@/admin/dto/user/update-user.dto';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { getPrismaErrorCode } from '@/prisma/prisma-error.util';
import { normalizeJsonInput } from '@/prisma/prisma-json.util';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const preferences = normalizeJsonInput(createUserDto.preferences);
      const user = await this.prismaService.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash: await bcrypt.hash(createUserDto.password, 12),
          avatarUrl: createUserDto.avatarUrl,
          preferences,
          role: createUserDto.role ?? 'TRAVELER',
        },
        omit: { passwordHash: true },
      });

      return user;
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException(
          'A user with the same email is already registered',
        );
      throw e;
    }
  }

  async findAll() {
    return this.prismaService.user.findMany({ omit: { passwordHash: true } });
  }

  async findOne(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const preferences =
        updateUserDto.preferences !== undefined
          ? normalizeJsonInput(updateUserDto.preferences)
          : undefined;
      const user = await this.prismaService.user.update({
        where: { id },
        data: {
          name: updateUserDto.name,
          email: updateUserDto.email,
          avatarUrl: updateUserDto.avatarUrl,
          role: updateUserDto.role,
          preferences,
          passwordHash: updateUserDto.password
            ? await bcrypt.hash(updateUserDto.password, 12)
            : undefined,
        },
        omit: { passwordHash: true },
      });

      return user;
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException(
          'A user with the same email is already registered',
        );
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('User not found');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.user.delete({
        where: { id },
        omit: { passwordHash: true },
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('User not found');
      throw e;
    }
  }

  async applyPlaceFeedback(userId: string, attractionId: string, liked: boolean) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, preferences: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const attraction = await this.prismaService.attraction.findUnique({
      where: { id: attractionId },
      include: { tags: { include: { tag: true } } },
    });
    if (!attraction) throw new NotFoundException('Attraction not found');

    const preferences = (user.preferences ?? {}) as Record<string, unknown>;
    const likedAttractions = new Set(
      Array.isArray(preferences.likedAttractions) ? (preferences.likedAttractions as string[]) : [],
    );
    const dislikedAttractions = new Set(
      Array.isArray(preferences.dislikedAttractions) ? (preferences.dislikedAttractions as string[]) : [],
    );
    const likedTags = new Set(
      Array.isArray(preferences.likedTags) ? (preferences.likedTags as string[]) : [],
    );
    const dislikedTags = new Set(
      Array.isArray(preferences.dislikedTags) ? (preferences.dislikedTags as string[]) : [],
    );
    const likedTypes = new Set(
      Array.isArray(preferences.likedTypes) ? (preferences.likedTypes as string[]) : [],
    );
    const dislikedTypes = new Set(
      Array.isArray(preferences.dislikedTypes) ? (preferences.dislikedTypes as string[]) : [],
    );

    const attractionTagNames = attraction.tags.map((tagMap) => tagMap.tag.name);

    if (liked) {
      likedAttractions.add(attractionId);
      dislikedAttractions.delete(attractionId);
      attractionTagNames.forEach((tag) => likedTags.add(tag));
      attractionTagNames.forEach((tag) => dislikedTags.delete(tag));
      if (attraction.type) {
        likedTypes.add(attraction.type);
        dislikedTypes.delete(attraction.type);
      }
    } else {
      dislikedAttractions.add(attractionId);
      likedAttractions.delete(attractionId);
      attractionTagNames.forEach((tag) => dislikedTags.add(tag));
      if (attraction.type) {
        dislikedTypes.add(attraction.type);
      }
    }

    const updatedPreferences = {
      ...preferences,
      likedAttractions: Array.from(likedAttractions),
      dislikedAttractions: Array.from(dislikedAttractions),
      likedTags: Array.from(likedTags),
      dislikedTags: Array.from(dislikedTags),
      likedTypes: Array.from(likedTypes),
      dislikedTypes: Array.from(dislikedTypes),
    };

    await this.prismaService.user.update({
      where: { id: userId },
      data: { preferences: updatedPreferences },
    });

    return {
      userId,
      placeId: attractionId,
      liked,
      updated: true,
    };
  }

  async resetUserVector(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prismaService.user.update({
      where: { id: userId },
      data: { preferences: normalizeJsonInput(null) },
    });

    return { userId, reset: true };
  }
}
