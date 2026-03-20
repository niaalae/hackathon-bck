import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRatingDto } from '@/admin/dto/rating/create-rating.dto';
import { UpdateRatingDto } from '@/admin/dto/rating/update-rating.dto';
import { getPrismaErrorCode } from '@/prisma/prisma-error.util';

@Injectable()
export class RatingService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createRatingDto: CreateRatingDto) {
    try {
      return await this.prismaService.rating.create({ data: createRatingDto });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('Rating already exists');
      throw e;
    }
  }

  findAll(params?: { offset?: number; limit?: number }) {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;
    return this.prismaService.rating.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const rating = await this.prismaService.rating.findUnique({ where: { id } });
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }
    return rating;
  }

  async update(id: string, updateRatingDto: UpdateRatingDto) {
    try {
      return await this.prismaService.rating.update({
        where: { id },
        data: updateRatingDto,
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('Rating already exists');
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('Rating not found');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.rating.delete({ where: { id } });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('Rating not found');
      throw e;
    }
  }
}
