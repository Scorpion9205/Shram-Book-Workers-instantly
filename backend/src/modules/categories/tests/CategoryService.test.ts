import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryService } from "../services/CategoryService.js";
import { NotFoundException } from "../../../core/exceptions/index.js";

describe("CategoryService", () => {
  let categoryRepoMock: any;
  let service: CategoryService;

  const category = { id: "cat_1", name: "Plumbing", description: null, createdAt: new Date(), updatedAt: new Date() };

  beforeEach(() => {
    categoryRepoMock = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countSkillsInCategory: vi.fn(),
    };

    service = new CategoryService(categoryRepoMock);
  });

  describe("getAllCategories", () => {
    it("maps _count.skills to skillCount for each category", async () => {
      categoryRepoMock.findAll.mockResolvedValue([{ ...category, _count: { skills: 3 } }]);

      const result = await service.getAllCategories();

      expect(result).toEqual([{ ...category, _count: { skills: 3 }, skillCount: 3 }]);
    });
  });

  describe("getCategoryById", () => {
    it("throws NotFoundException when the category does not exist", async () => {
      categoryRepoMock.findById.mockResolvedValue(null);
      await expect(service.getCategoryById("missing")).rejects.toThrow(NotFoundException);
    });

    it("returns the category when found", async () => {
      categoryRepoMock.findById.mockResolvedValue(category);
      await expect(service.getCategoryById("cat_1")).resolves.toEqual(category);
    });
  });

  describe("createCategory", () => {
    it("delegates creation to the repository", async () => {
      categoryRepoMock.create.mockResolvedValue(category);

      const result = await service.createCategory({ name: "Plumbing" });

      expect(categoryRepoMock.create).toHaveBeenCalledWith({ name: "Plumbing" });
      expect(result).toEqual(category);
    });
  });

  describe("updateCategory", () => {
    it("throws NotFoundException when the category does not exist", async () => {
      categoryRepoMock.findById.mockResolvedValue(null);
      await expect(service.updateCategory("missing", { name: "New" })).rejects.toThrow(NotFoundException);
      expect(categoryRepoMock.update).not.toHaveBeenCalled();
    });

    it("updates an existing category", async () => {
      categoryRepoMock.findById.mockResolvedValue(category);
      categoryRepoMock.update.mockResolvedValue({ ...category, name: "Electrical" });

      const result = await service.updateCategory("cat_1", { name: "Electrical" });

      expect(categoryRepoMock.update).toHaveBeenCalledWith("cat_1", { name: "Electrical" });
      expect(result.name).toBe("Electrical");
    });
  });

  describe("deleteCategory", () => {
    it("throws NotFoundException when the category does not exist", async () => {
      categoryRepoMock.findById.mockResolvedValue(null);
      await expect(service.deleteCategory("missing")).rejects.toThrow(NotFoundException);
      expect(categoryRepoMock.delete).not.toHaveBeenCalled();
    });

    it("deletes an existing category without checking skill usage (Skill.categoryId is ON DELETE SET NULL)", async () => {
      categoryRepoMock.findById.mockResolvedValue(category);

      await service.deleteCategory("cat_1");

      expect(categoryRepoMock.delete).toHaveBeenCalledWith("cat_1");
      expect(categoryRepoMock.countSkillsInCategory).not.toHaveBeenCalled();
    });
  });
});
