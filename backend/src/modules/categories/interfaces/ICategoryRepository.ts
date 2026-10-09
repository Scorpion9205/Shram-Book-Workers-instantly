import type { Category } from '@prisma/client';

export interface CreateCategoryData {
  name: string;
  description?: string | undefined;
}

export interface UpdateCategoryData {
  name?: string | undefined;
  description?: string | undefined;
}

export interface ICategoryRepository {
  findAll(): Promise<(Category & { _count: { skills: number } })[]>;
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  create(data: CreateCategoryData): Promise<Category>;
  update(id: string, data: UpdateCategoryData): Promise<Category>;
  delete(id: string): Promise<void>;
  countSkillsInCategory(id: string): Promise<number>;
}
