// API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// Item Types
export interface Item {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateItemRequest {
  name: string;
  description?: string;
}

export interface CreateItemResponse {
  success: boolean;
  id: number;
}

export interface GetItemsResponse {
  items: Item[];
}

export interface DeleteItemResponse {
  success: boolean;
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  database?: string;
}

// Fruit Types
export interface Fruit {
  id: number;
  name: string;
  price: number;
  quantity: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateFruitRequest {
  name: string;
  price: number;
  quantity?: number;
}

export interface UpdateFruitRequest {
  name?: string;
  price?: number;
  quantity?: number;
}

export interface CreateFruitResponse {
  success: boolean;
  id: number;
  fruit: Fruit;
}

export interface GetFruitsResponse {
  fruits: Fruit[];
  total?: number;
}

export interface DeleteFruitResponse {
  success: boolean;
  message: string;
}

// User Types (Clerk sync)
export interface User {
  id: string; // Clerk user ID (e.g., user_xxx)
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}
