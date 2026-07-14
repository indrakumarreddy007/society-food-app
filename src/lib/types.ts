export type Role = "customer" | "chef" | "admin";

export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "rejected";

export type PaymentStatus = "pending" | "paid";

export type IssueStatus = "open" | "resolved";

export type IssueType = "late_delivery" | "quality_issue" | "wrong_item";

export interface Society {
  id: string;
  name: string;
}

export interface Chef {
  id: string;
  name: string;
  kitchenName: string;
  phone: string;
  societyId: string;
  rating: number;
  isVerified: boolean;
  bio: string;
  walletBalance: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  societyId: string;
  address: string;
  walletBalance: number;
}

export interface Dish {
  id: string;
  chefId: string;
  name: string;
  description: string;
  price: number;
  quantityAvailable: number;
  cutoffTime: string;
  tags: string[];
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  chefId: string;
  dishId: string;
  quantity: number;
  totalAmount: number;
  note: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  address: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  orderId: string;
  createdByCustomerId: string;
  issueType: IssueType;
  message: string;
  status: IssueStatus;
  createdAt: string;
}

export type WalletTransactionType = "topup" | "debit" | "credit" | "settlement" | "refund";

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  description: string;
  customerId?: string;
  chefId?: string;
  orderId?: string;
  createdAt: string;
}

export interface StoreData {
  societies: Society[];
  chefs: Chef[];
  customers: Customer[];
  dishes: Dish[];
  orders: Order[];
  issues: Issue[];
  walletTransactions: WalletTransaction[];
}

export interface DishWithChef extends Dish {
  chefName: string;
  chefRating: number;
  societyName: string;
}

export interface OrderWithDetails extends Order {
  chefName: string;
  customerName: string;
  dishName: string;
}

export interface IssueWithDetails extends Issue {
  customerName: string;
  orderStatus: OrderStatus;
}

export interface DashboardData {
  societies: Society[];
  chefs: Chef[];
  customers: Customer[];
  dishes: DishWithChef[];
  orders: OrderWithDetails[];
  issues: IssueWithDetails[];
  walletTransactions: WalletTransaction[];
}
