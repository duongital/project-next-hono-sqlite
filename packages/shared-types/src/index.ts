// API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export interface SendOTPRequest {
  email: string;
}

export interface SendOTPResponse {
  success: boolean;
  message: string;
}

export interface VerifyOTPRequest {
  email: string;
  code: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  token?: string;
  user?: User;
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

export interface ErrorResponse {
  error: string;
  message?: string;
}

// Todo Types
export interface Todo {
  id: number;
  task: string;
  isDone: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateTodoRequest {
  task: string;
  isDone?: boolean;
}

export interface UpdateTodoRequest {
  task?: string;
  isDone?: boolean;
}

export interface CreateTodoResponse {
  success: boolean;
  id: number;
  todo: Todo;
}

export interface GetTodosResponse {
  todos: Todo[];
  total?: number;
}

export interface DeleteTodoResponse {
  success: boolean;
  message: string;
}

// Image Types
export interface Image {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  r2Key: string;
  url: string;
  width: number | null;
  height: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateImageRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface CreateImageResponse {
  image: Image;
  uploadUrl: string;
}

export interface GetImagesResponse {
  images: Image[];
}

export interface DeleteImageResponse {
  success: boolean;
  message: string;
}

export interface ImageUploadResponse {
  success: boolean;
  url: string;
}
