import { api } from "../api/api";

/** ====== TYPES ====== */

export type PromotionItemRequestDTO = {
  productId: number;
  discountPercent: number;
};

export type PromotionCreateRequestDTO = {
  name: string;
  startsAt: string; // ISO (es: "2025-01-10T10:00")
  endsAt: string; // ISO
  active: boolean;
  items: PromotionItemRequestDTO[];
};

export type PromotionUpdateRequestDTO = {
  name?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean | null;

  // opzionale (se un domani vuoi supportare archiviazione via PUT)
  archived?: boolean | null;
};

export type PromotionItemResponseDTO = {
  productId: number;
  productName: string;
  discountPercent: number;
};

export type PromotionResponseDTO = {
  id: number;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;

  archived?: boolean;

  items: PromotionItemResponseDTO[];
};

/** ====== API ====== */

export async function getAdminPromotions(includeArchived: boolean = false): Promise<PromotionResponseDTO[]> {
  const { data } = await api.get<PromotionResponseDTO[]>("/api/admin/promotions", {
    params: { includeArchived },
  });
  return data ?? [];
}

export async function getAdminPromotionById(id: number): Promise<PromotionResponseDTO> {
  const { data } = await api.get<PromotionResponseDTO>(`/api/admin/promotions/${id}`);
  return data;
}

export async function createAdminPromotion(req: PromotionCreateRequestDTO): Promise<PromotionResponseDTO> {
  const payload: PromotionCreateRequestDTO = {
    ...req,
    name: req.name.trim(),
    items: (req.items ?? []).map((it) => ({
      productId: Number(it.productId),
      discountPercent: Number(it.discountPercent),
    })),
  };

  const { data } = await api.post<PromotionResponseDTO>("/api/admin/promotions", payload);
  return data;
}

export async function updateAdminPromotion(id: number, req: PromotionUpdateRequestDTO): Promise<PromotionResponseDTO> {
  const payload: PromotionUpdateRequestDTO = {
    name: req.name != null ? req.name.trim() : req.name,
    startsAt: req.startsAt ?? null,
    endsAt: req.endsAt ?? null,
    active: req.active ?? null,
    archived: req.archived ?? null,
  };

  const { data } = await api.put<PromotionResponseDTO>(`/api/admin/promotions/${id}`, payload);
  return data;
}

/**
 * ✅ Archivia (endpoint dedicato)
 * Backend: POST /api/admin/promotions/{id}/archive
 */
export async function archiveAdminPromotion(id: number): Promise<PromotionResponseDTO> {
  const { data } = await api.post<PromotionResponseDTO>(`/api/admin/promotions/${id}/archive`, {});
  return data;
}
