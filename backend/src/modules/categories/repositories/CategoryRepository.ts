import { Prisma } from '@prisma/client';
import type { Category } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { ConflictException } from '../../../core/exceptions/index.js';
import type { ICategoryRepository, CreateCategoryData, UpdateCategoryData } from '../interfaces/ICategoryRepository.js';

export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.client.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { skills: true } } },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.client.category.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.prisma.client.category.findUnique({ where: { name } });
  }

  async create(data: CreateCategoryData): Promise<Category> {
    try {
      return await this.prisma.client.category.create({
        data: { name: data.name, description: data.description ?? null },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A category with this name already exists');
      }
      throw err;
    }
  }

  async update(id: string, data: UpdateCategoryData): Promise<Category> {
    try {
      return await this.prisma.client.category.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A category with this name already exists');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.category.delete({ where: { id } });
  }

  async countSkillsInCategory(id: string): Promise<number> {
    return this.prisma.client.skill.count({ where: { categoryId: id } });
  }
}
