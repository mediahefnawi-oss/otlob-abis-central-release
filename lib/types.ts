export type Role = 'customer' | 'provider' | 'courier' | 'admin';
export type ProviderType = 'restaurant' | 'supermarket' | 'pharmacy' | 'clinic';
export type AccountStatus = 'active' | 'pending' | 'rejected' | 'suspended';

export interface User {
  id: string;
  name: string;
  phone: string;
  pass: string;
  role: Role;
  address: string;
  status: AccountStatus;
  createdAt: number;
  // courier
  vehicle?: string;
  available?: boolean;
  availableSince?: number;
}

export interface Provider {
  id: string;
  ownerId: string;
  type: ProviderType;
  name: string;
  desc: string;
  address: string;
  phone: string;
  emoji: string;
  rating: number;
  eta: string;
  deliveryFee: number;
  status: AccountStatus;
  open: boolean;
  specialty?: string;
  createdAt: number;
}

export interface Product {
  id: string;
  providerId: string;
  kind: 'item' | 'doctor';
  name: string;
  price: number;
  emoji: string;
  category: string;
  desc: string;
  available: boolean;
  slots?: string[];
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  emoji: string;
}

export interface Order {
  id: string;
  number: number;
  groupId: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  notes: string;
  providerId: string;
  providerName: string;
  providerType: ProviderType | 'custom';
  providerOwnerId: string;
  items: OrderItem[];
  customText?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  courierId?: string;
  courierName?: string;
  rejectReason?: string;
  createdAt: number;
  updatedAt: number;
  history: { status: OrderStatus; at: number }[];
}

export type ApptStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  number: number;
  customerId: string;
  patientName: string;
  phone: string;
  providerId: string;
  clinicName: string;
  clinicOwnerId: string;
  clinicAddress: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string; // yyyy-mm-dd
  time: string;
  fee: number;
  notes: string;
  status: ApptStatus;
  invoiceId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface InvoicePart {
  orderId: string;
  providerId: string;
  providerName: string;
  providerType: ProviderType | 'custom';
  items: OrderItem[];
  customText?: string;
  subtotal: number;
  deliveryFee: number;
}

export interface Invoice {
  id: string;
  number: string;
  kind: 'delivery' | 'booking';
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  createdAt: number;
  parts: InvoicePart[];
  total: number;
  // booking
  appointmentId?: string;
  ownerId?: string;
  clinicName?: string;
  doctorName?: string;
  specialty?: string;
  date?: string;
  time?: string;
  fee?: number;
}

export interface Message {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: Role | 'system';
  text: string;
  createdAt: number;
}

export interface Settings {
  appEnabled: boolean;
  maintenanceMessage: string;
  announcement: string;
  autoAssign: boolean;
  supportPhone: string;
  supportName: string;
}

export interface DB {
  rev: number;
  seq: number;
  users: User[];
  providers: Provider[];
  products: Product[];
  orders: Order[];
  appointments: Appointment[];
  invoices: Invoice[];
  messages: Message[];
  settings: Settings;
}

export interface CartLine {
  productId: string;
  qty: number;
}
