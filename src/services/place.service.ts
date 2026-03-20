import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePlaceDto } from '@/admin/dto/place/create-place.dto';
import { UpdatePlaceDto } from '@/admin/dto/place/update-place.dto';
import { getPrismaErrorCode } from '@/prisma/prisma-error.util';

@Injectable()
export class PlaceService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createPlaceDto: CreatePlaceDto) {
    try {
      const attraction = await this.prismaService.attraction.create({
        data: {
          name: createPlaceDto.name,
          slug: createPlaceDto.slug,
          type: createPlaceDto.type,
          lat: createPlaceDto.lat,
          lng: createPlaceDto.lng,
          description: createPlaceDto.description,
          avgPrice: createPlaceDto.avgPrice,
          durationMinutes: createPlaceDto.durationMinutes,
          coverImage: createPlaceDto.coverImage,
          city: { connect: { id: createPlaceDto.cityId } },
          tags: createPlaceDto.tagIds?.length
            ? {
                createMany: {
                  data: createPlaceDto.tagIds.map((tagId) => ({ tagId })),
                  skipDuplicates: true,
                },
              }
            : undefined,
          media: createPlaceDto.media?.length
            ? {
                createMany: {
                  data: createPlaceDto.media.map((item, index) => ({
                    type: item.type,
                    url: item.url,
                    caption: item.caption,
                    position: item.position ?? index,
                  })),
                },
              }
            : undefined,
        },
        include: {
          city: true,
          media: true,
          tags: { include: { tag: true } },
        },
      });

      return attraction;
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('Attraction with same slug already exists');
      throw e;
    }
  }

  findAll(params?: { offset?: number; limit?: number }) {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;
    return this.prismaService.attraction.findMany({
      skip: offset,
      take: limit,
      include: {
        city: true,
        media: true,
        tags: { include: { tag: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const attraction = await this.prismaService.attraction.findUnique({
      where: { id },
      include: {
        city: true,
        media: true,
        tags: { include: { tag: true } },
      },
    });

    if (!attraction) {
      throw new NotFoundException('Attraction not found');
    }

    return attraction;
  }

  async update(id: string, updatePlaceDto: UpdatePlaceDto) {
    try {
      return await this.prismaService.$transaction(async (tx) => {
        if (updatePlaceDto.tagIds) {
          await tx.attractionTagMap.deleteMany({ where: { attractionId: id } });
          if (updatePlaceDto.tagIds.length) {
            await tx.attractionTagMap.createMany({
              data: updatePlaceDto.tagIds.map((tagId) => ({ attractionId: id, tagId })),
              skipDuplicates: true,
            });
          }
        }

        if (updatePlaceDto.media) {
          await tx.attractionMedia.deleteMany({ where: { attractionId: id } });
          if (updatePlaceDto.media.length) {
            await tx.attractionMedia.createMany({
              data: updatePlaceDto.media.map((item, index) => ({
                attractionId: id,
                type: item.type,
                url: item.url,
                caption: item.caption,
                position: item.position ?? index,
              })),
            });
          }
        }

        return tx.attraction.update({
          where: { id },
          data: {
            name: updatePlaceDto.name,
            slug: updatePlaceDto.slug,
            type: updatePlaceDto.type,
            lat: updatePlaceDto.lat,
            lng: updatePlaceDto.lng,
            description: updatePlaceDto.description,
            avgPrice: updatePlaceDto.avgPrice,
            durationMinutes: updatePlaceDto.durationMinutes,
            coverImage: updatePlaceDto.coverImage,
            city: updatePlaceDto.cityId
              ? { connect: { id: updatePlaceDto.cityId } }
              : undefined,
          },
          include: {
            city: true,
            media: true,
            tags: { include: { tag: true } },
          },
        });
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('Attraction with same slug already exists');
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('Attraction not found');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.attraction.delete({ where: { id } });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('Attraction not found');
      throw e;
    }
  }

  async findRecommendedForUser(userId: string, limit = 10) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, preferences: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const preferences = (user.preferences ?? {}) as Record<string, unknown>;
    const likedTags = Array.isArray(preferences.likedTags)
      ? (preferences.likedTags as string[])
      : [];
    const likedTypes = Array.isArray(preferences.likedTypes)
      ? (preferences.likedTypes as string[])
      : [];

    const where =
      likedTags.length || likedTypes.length
        ? {
            ...(likedTypes.length ? { type: { in: likedTypes } } : {}),
            ...(likedTags.length
              ? { tags: { some: { tag: { name: { in: likedTags } } } } }
              : {}),
          }
        : undefined;

    const recommendations = await this.prismaService.attraction.findMany({
      where,
      take: limit,
      include: {
        city: true,
        media: true,
        tags: { include: { tag: true } },
      },
    });

    if (recommendations.length) return recommendations;

    return this.prismaService.attraction.findMany({
      take: limit,
      include: {
        city: true,
        media: true,
        tags: { include: { tag: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
