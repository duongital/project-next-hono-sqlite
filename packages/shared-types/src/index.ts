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
}
