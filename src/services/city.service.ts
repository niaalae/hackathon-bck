import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCityDto } from '@/admin/dto/city/create-city.dto';
import { UpdateCityDto } from '@/admin/dto/city/update-city.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { getPrismaErrorCode } from '@/prisma/prisma-error.util';

@Injectable()
export class CityService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCityDto: CreateCityDto) {
    try {
      return await this.prismaService.city.create({
        data: {
          name: createCityDto.name,
          slug: createCityDto.slug,
          lat: createCityDto.lat,
          lng: createCityDto.lng,
          timezone: createCityDto.timezone,
          description: createCityDto.description,
          coverImage: createCityDto.coverImage,
          region: { connect: { id: createCityDto.regionId } },
        },
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('City with same slug already exists');
      throw e;
    }
  }

  findAll(params?: { offset?: number; limit?: number }) {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;
    return this.prismaService.city.findMany({
      skip: offset,
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const city = await this.prismaService.city.findUnique({ where: { id } });
    if (!city) {
      throw new NotFoundException('City not found');
    }
    return city;
  }

  async update(id: string, updateCityDto: UpdateCityDto) {
    try {
      return await this.prismaService.city.update({
        where: { id },
        data: {
          name: updateCityDto.name,
          slug: updateCityDto.slug,
          lat: updateCityDto.lat,
          lng: updateCityDto.lng,
          timezone: updateCityDto.timezone,
          description: updateCityDto.description,
          coverImage: updateCityDto.coverImage,
          region: updateCityDto.regionId
            ? { connect: { id: updateCityDto.regionId } }
            : undefined,
        },
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('City with same slug already exists');
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('City not found');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.city.delete({ where: { id } });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('City not found');
      throw e;
    }
  }
}
