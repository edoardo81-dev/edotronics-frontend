import http from "../api/http";

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number; // page index (0-based)
  size: number;
  first: boolean;
  last: boolean;
};

export type OrderItemDTO = {
  productId: number;
  orderedQuantity: number;
  name?: string;
  price?: number; // unitPriceAtPurchase dal backend
};

export type OrderDTO = {
  idOrder: number;
  dateTime: string; // ISO string
  idUser?: number;

  firstName: string;
  lastName: string;
  address: string;
  city: string;
  phone: string;

  description?: string | null;
  products: OrderItemDTO[];
};

export async function getMyOrders(params?: {
  page?: number;
  size?: number;
  sort?: string; // es: "dateTime,desc"
}) {
  const res = await http.get<PageResponse<OrderDTO>>("/api/me/orders", {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 10,
      sort: params?.sort ?? "dateTime,desc",
    },
  });
  return res.data;
}

export async function getMyOrderById(idOrder: number) {
  const res = await http.get<OrderDTO>(`/api/me/orders/${idOrder}`);
  return res.data;
}

export async function createMyOrder(payload: {
  description?: string | null;
  products: { productId: number; orderedQuantity: number }[];
}) {
  const res = await http.post<OrderDTO>("/api/me/orders", payload);
  return res.data;
}

