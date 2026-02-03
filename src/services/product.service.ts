import { api } from "../api/api";
import type { Page, ProductCategory, ProductDTO } from "../types/dto";

export async function getCategories(): Promise<ProductCategory[]> {
  const { data } = await api.get<ProductCategory[]>("/api/public/products/categories");
  return data;
}

export async function getProducts(params: {
  q?: string | null;
  category?: ProductCategory | null;
  page?: number;
  size?: number;
  sort?: string; // es: "name,asc"
}): Promise<Page<ProductDTO>> {
  const { q, category, page = 0, size = 10, sort = "name,asc" } = params;

  const { data } = await api.get<Page<ProductDTO>>("/api/public/products", {
    params: {
      q: q && q.trim() ? q.trim() : undefined,
      category: category ?? undefined,
      page,
      size,
      sort,
    },
  });

  return data;
}
