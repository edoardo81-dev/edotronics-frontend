import http from "../api/http";

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number; // 0-based
  size: number;
  first: boolean;
  last: boolean;
};

export type OrderItemDTO = {
  productId: number;
  orderedQuantity: number;
  name?: string;
  price?: number;
};

export type OrderDTO = {
  idOrder: number;
  dateTime: string;
  idUser?: number;

  firstName: string;
  lastName: string;
  address: string;
  city: string;
  phone: string;

  description?: string | null;
  products: OrderItemDTO[];
};

export type AdminOrderSearchParams = {
  page?: number;
  size?: number;
  sort?: string;

  customer?: string | null;
  product?: string | null;
  city?: string | null;

  // ISO LocalDateTime: "YYYY-MM-DDTHH:mm" (ok anche senza secondi)
  from?: string | null;
  to?: string | null;

  // "DAY" | "WEEK" | "MONTH"
  period?: string | null;
};

export async function getAdminOrders(params?: { page?: number; size?: number; sort?: string }) {
  const res = await http.get<PageResponse<OrderDTO>>("/api/admin/orders", {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 10,
      sort: params?.sort ?? "dateTime,desc",
    },
  });
  return res.data;
}

export async function searchAdminOrders(params: AdminOrderSearchParams) {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const sort = params.sort ?? "dateTime,desc";

  const customer = params.customer?.trim() ? params.customer.trim() : undefined;
  const product = params.product?.trim() ? params.product.trim() : undefined;
  const city = params.city?.trim() ? params.city.trim() : undefined;

  const from = params.from?.trim() ? params.from.trim() : undefined;
  const to = params.to?.trim() ? params.to.trim() : undefined;

  // Se l’utente imposta from/to, il backend userà quelli e ignorerà "period"
  const period =
    !from && !to && params.period?.trim() ? params.period.trim() : undefined;

  const res = await http.get<PageResponse<OrderDTO>>("/api/admin/orders/search", {
    params: {
      page,
      size,
      sort,
      customer,
      product,
      city,
      from,
      to,
      period,
    },
  });

  return res.data;
}

export async function deleteAdminOrder(idOrder: number) {
  await http.delete(`/api/admin/orders/${idOrder}`);
}
