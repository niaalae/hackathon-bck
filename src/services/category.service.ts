import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCategoryDto } from '@/admin/dto/category/create-category.dto';
import { UpdateCategoryDto } from '@/admin/dto/category/update-category.dto';
import { getPrismaErrorCode } from '@/prisma/prisma-error.util';

@Injectable()
export class CategoryService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      return await this.prismaService.tag.create({ data: createCategoryDto });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('Tag already exists');
      throw e;
    }
  }

  findAll(params?: { offset?: number; limit?: number }) {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;
    return this.prismaService.tag.findMany({
      skip: offset,
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const tag = await this.prismaService.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return tag;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      return await this.prismaService.tag.update({
        where: { id },
        data: updateCategoryDto,
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('Tag already exists');
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('Tag not found');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.tag.delete({ where: { id } });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('Tag not found');
      throw e;
    }
  }
}
