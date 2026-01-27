// Database types for the restaurant ordering system

export type OrderStatus = 'pending' | 'pending_payment' | 'cash_on_delivery' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'expired';
export type PaymentMethod = 'bank_transfer' | 'cash';

export interface Category {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  venue_id: string | null;
  name: string;
  description: string | null;
  price_kobo: number;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemWithCategory extends MenuItem {
  categories: Category;
}

export interface Order {
  id: string;
  order_reference: string;
  venue_id: string | null;
  table_id: string | null;
  table_number: number;
  table_label: string | null;
  customer_name: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_confirmed: boolean;
  total_kobo: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemSnapshot {
  name: string;
  description: string | null;
  price_kobo: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price_kobo: number;
  item_snapshot: ItemSnapshot;
  created_at: string;
}

export interface OrderItemWithMenu extends OrderItem {
  menu_items: MenuItem;
}

export interface OrderWithItems extends Order {
  order_items: OrderItemWithMenu[];
  payment_proofs?: PaymentProof[];
}

export interface PaymentProof {
  id: string;
  order_id: string;
  image_url: string;
  uploaded_at: string;
}

export interface BankDetails {
  id: string;
  venue_id: string | null;
  bank_name: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
  created_at: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Venue {
  id: string;
  venue_slug: string;
  name: string;
  created_at: string;
}

export interface Table {
  id: string;
  venue_id: string;
  label: string;
  qr_token: string;
  active: boolean;
  created_at: string;
}

export interface TableWithVenue extends Table {
  venues: Venue;
}
