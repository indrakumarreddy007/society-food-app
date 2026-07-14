export interface CartItem {
  dishId: string;
  quantity: number;
  note: string;
}

export const CART_STORAGE_KEY = "society-food-cart-v1";
export const CART_CUSTOMER_STORAGE_KEY = "society-food-cart-customer-v1";
export const CHEF_SELECTION_STORAGE_KEY = "society-food-chef-v1";
export const ROLE_SELECTION_STORAGE_KEY = "society-food-role-v1";

export function parseCartItems(rawValue: string | null): CartItem[] {
  if (!rawValue) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => {
        if (
          typeof entry === "object" &&
          entry !== null &&
          "dishId" in entry &&
          "quantity" in entry &&
          "note" in entry &&
          typeof entry.dishId === "string" &&
          typeof entry.quantity === "number" &&
          typeof entry.note === "string"
        ) {
          return {
            dishId: entry.dishId,
            quantity: Math.max(1, Math.floor(entry.quantity)),
            note: entry.note,
          };
        }
        return null;
      })
      .filter((entry): entry is CartItem => entry !== null);
  } catch {
    return [];
  }
}
