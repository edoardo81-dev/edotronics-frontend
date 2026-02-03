export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  role: "ADMIN" | "USER" | string;
};

export type ProductCategory =
  | "SMARTPHONES"
  | "PC_TABLETS"
  | "MONITOR"
  | "SCANNER_STAMPANTI"
  | "ACCESSORI"
  | "USATO_RICONDIZIONATO";

export type ProductDTO = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  category: ProductCategory;

  // promo output (dal tuo backend)
  promoActive?: boolean;
  promoName?: string | null;
  discountPercent?: number | null;
  oldPrice?: number | null;
  discountedPrice?: number | null;
};

export type Page<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ProductSalesView = {
  productId: number;
  name: string;
  totalSold: number;
};

export type StockAlertDTO = {
  id: number;
  productId: number;
  productName: string;
  currentQuantity: number;
  threshold: number;
  status: string; // es: "OPEN" | "ACKED"
  createdAt: string; // ISO oppure stringa già formattata dal backend
};

