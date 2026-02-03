import { api } from "../api/api";
import type { Page, ProductCategory, ProductDTO, ProductSalesView } from "../types/dto";

// Controller:
// GET    /api/admin/products?q=&category=&page=&size=&sort=
// GET    /api/admin/products/{id}
// POST   /api/admin/products              body: CreateProductDTO
// PUT    /api/admin/products/{id}         body: UpdateProductDTO
// DELETE /api/admin/products/{id}
// POST   /api/admin/products/{id}/restock body: { addQuantity: number }
// GET    /api/admin/products/stats/top-selling?limit=&days=
// GET    /api/admin/products/stats/least-selling?limit=&days=

export type CreateProductDTO = {
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  category: ProductCategory;
};

export type UpdateProductDTO = {
  name: string;
  price: number;
  imageUrl: string;
  category: ProductCategory;
};

export async function adminGetProducts(params: {
  q?: string | null;
  category?: ProductCategory | null;
  page?: number;
  size?: number;
  sort?: string; // es: "name,asc"
}): Promise<Page<ProductDTO>> {
  const { q, category, page = 0, size = 10, sort = "name,asc" } = params;

  const { data } = await api.get<Page<ProductDTO>>("/api/admin/products", {
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

export async function adminGetCategories(): Promise<ProductCategory[]> {
  const { data } = await api.get<ProductCategory[]>(
    "/api/public/products/categories"
  );
  return data;
}

export async function adminCreateProduct(payload: CreateProductDTO): Promise<ProductDTO> {
  const { data } = await api.post<ProductDTO>("/api/admin/products", payload);
  return data;
}

export async function adminGetProductById(id: number): Promise<ProductDTO> {
  const { data } = await api.get<ProductDTO>(`/api/admin/products/${id}`);
  return data;
}

export async function adminUpdateProduct(
  id: number,
  payload: UpdateProductDTO
): Promise<ProductDTO> {
  const { data } = await api.put<ProductDTO>(`/api/admin/products/${id}`, payload);
  return data;
}

export async function adminDeleteProduct(id: number): Promise<void> {
  await api.delete(`/api/admin/products/${id}`);
}

export async function adminRestockProduct(
  id: number,
  addQuantity: number
): Promise<ProductDTO> {
  const { data } = await api.post<ProductDTO>(`/api/admin/products/${id}/restock`, {
    addQuantity,
  });
  return data;
}

// ===================== STATS =====================
// days è opzionale: se il backend non lo supporta, la tua UI fa fallback su "Sempre"
export async function adminTopSelling(params?: { limit?: number; days?: number }): Promise<ProductSalesView[]> {
  const { limit = 3, days } = params ?? {};
  const { data } = await api.get<ProductSalesView[]>("/api/admin/products/stats/top-selling", {
    params: {
      limit,
      days: days ?? undefined,
    },
  });
  return data;
}

export async function adminLeastSelling(params?: { limit?: number; days?: number }): Promise<ProductSalesView[]> {
  const { limit = 3, days } = params ?? {};
  const { data } = await api.get<ProductSalesView[]>("/api/admin/products/stats/least-selling", {
    params: {
      limit,
      days: days ?? undefined,
    },
  });
  return data;
}
