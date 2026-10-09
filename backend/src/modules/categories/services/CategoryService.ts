import type { ICategoryRepository, CreateCategoryData, UpdateCategoryData } from '../interfaces/ICategoryRepository.js';
import type { ICategoryService } from '../interfaces/ICategoryService.js';
import { NotFoundException } from '../../../core/exceptions/index.js';

export class CategoryService implements ICategoryService {
  constructor(private readonly categoryRepo: ICategoryRepository) {}

  async getAllCategories() {
    const categories = await this.categoryRepo.findAll();
    return categories.map((c) => ({ ...c, skillCount: c._count.skills }));
  }

  async getCategoryById(id: string) {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundException('Category', id);
    }
    return category;
  }

  async createCategory(data: CreateCategoryData) {
    return this.categoryRepo.create(data);
  }

  async updateCategory(id: string, data: UpdateCategoryData) {
    const existing = await this.categoryRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Category', id);
    }
    return this.categoryRepo.update(id, data);
  }

  async deleteCategory(id: string): Promise<void> {
    const existing = await this.categoryRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Category', id);
    }
    // Skill.categoryId is ON DELETE SET NULL — deleting a category simply un-categorizes its
    // skills rather than failing or cascading deletes, so no extra guard is needed here.
    await this.categoryRepo.delete(id);
  }
}
