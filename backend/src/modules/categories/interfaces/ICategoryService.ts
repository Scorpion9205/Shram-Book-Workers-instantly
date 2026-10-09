import type { Category } from '@prisma/client';
import type { CreateCategoryData, UpdateCategoryData } from './ICategoryRepository.js';

export interface ICategoryService {
  getAllCategories(): Promise<(Category & { skillCount: number })[]>;
  getCategoryById(id: string): Promise<Category>;
  createCategory(data: CreateCategoryData): Promise<Category>;
  updateCategory(id: string, data: UpdateCategoryData): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
}
