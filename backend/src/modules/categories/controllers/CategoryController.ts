import type { Request, Response } from "express";
import { BaseController } from "../../../core/base/BaseController.js";
import type { ICategoryService } from "../interfaces/ICategoryService.js";
import { createCategorySchema, updateCategorySchema } from "../validations/category.validation.js";
import { BadRequestException } from "../../../core/exceptions/index.js";

export class CategoryController extends BaseController {
  constructor(private readonly categoryService: ICategoryService) {
    super();
  }

  getAllCategories = async (_req: Request, res: Response): Promise<void> => {
    const categories = await this.categoryService.getAllCategories();
    this.ok(res, { categories }, "Categories retrieved successfully");
  };

  getCategoryById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    if (!id) throw new BadRequestException("Invalid category id");
    const category = await this.categoryService.getCategoryById(id);
    this.ok(res, { category }, "Category retrieved successfully");
  };

  createCategory = async (req: Request, res: Response): Promise<void> => {
    const data = this.validate(createCategorySchema, req.body);
    const category = await this.categoryService.createCategory(data);
    this.created(res, { category }, "Category created successfully");
  };

  updateCategory = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    if (!id) throw new BadRequestException("Invalid category id");
    const data = this.validate(updateCategorySchema, req.body);
    const category = await this.categoryService.updateCategory(id, data);
    this.ok(res, { category }, "Category updated successfully");
  };

  deleteCategory = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    if (!id) throw new BadRequestException("Invalid category id");
    await this.categoryService.deleteCategory(id);
    this.ok(res, null, "Category deleted successfully");
  };
}
