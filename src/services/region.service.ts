import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRegionDto } from '@/admin/dto/region/create-region.dto';
import { UpdateRegionDto } from '@/admin/dto/region/update-region.dto';
import { getPrismaErrorCode } from '@/prisma/prisma-error.util';

@Injectable()
export class RegionService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createRegionDto: CreateRegionDto) {
    try {
      return await this.prismaService.region.create({ data: createRegionDto });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('Region with same slug already exists');
      throw e;
    }
  }

  findAll(params?: { offset?: number; limit?: number }) {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;
    return this.prismaService.region.findMany({
      skip: offset,
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const region = await this.prismaService.region.findUnique({ where: { id } });
    if (!region) {
      throw new NotFoundException('Region not found');
    }
    return region;
  }

  async update(id: string, updateRegionDto: UpdateRegionDto) {
    try {
      return await this.prismaService.region.update({
        where: { id },
        data: updateRegionDto,
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('Region with same slug already exists');
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('Region not found');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.region.delete({ where: { id } });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('Region not found');
      throw e;
    }
  }
}
