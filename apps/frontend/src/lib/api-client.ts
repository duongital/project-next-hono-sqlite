import type {
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  GetItemsResponse,
  CreateItemRequest,
  CreateItemResponse,
  DeleteItemResponse,
  HealthCheckResponse,
  Fruit,
  GetFruitsResponse,
  CreateFruitRequest,
  CreateFruitResponse,
  UpdateFruitRequest,
  DeleteFruitResponse,
  Todo,
  GetTodosResponse,
  CreateTodoRequest,
  CreateTodoResponse,
  UpdateTodoRequest,
  DeleteTodoResponse,
  Image,
  GetImagesResponse,
  CreateImageRequest,
  CreateImageResponse,
  DeleteImageResponse,
  ImageUploadResponse,
} from '@shared/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

// Helper to manage JWT token in localStorage
export const tokenManager = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  },
  setToken: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
  },
  removeToken: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
  },
};

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    const token = tokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Merge existing headers
    if (options?.headers) {
      const existingHeaders = new Headers(options.headers);
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth methods
  async sendOTP(data: SendOTPRequest): Promise<SendOTPResponse> {
    return this.request<SendOTPResponse>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyOTP(data: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    return this.request<VerifyOTPResponse>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/api/health');
  }

  async getItems(): Promise<GetItemsResponse> {
    return this.request<GetItemsResponse>('/api/items');
  }

  async createItem(data: CreateItemRequest): Promise<CreateItemResponse> {
    return this.request<CreateItemResponse>('/api/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteItem(id: number): Promise<DeleteItemResponse> {
    return this.request<DeleteItemResponse>(`/api/items/${id}`, {
      method: 'DELETE',
    });
  }

  // Fruits API methods
  async getFruits(): Promise<GetFruitsResponse> {
    return this.request<GetFruitsResponse>('/api/fruits');
  }

  async getFruit(id: number): Promise<Fruit> {
    return this.request<Fruit>(`/api/fruits/${id}`);
  }

  async createFruit(data: CreateFruitRequest): Promise<CreateFruitResponse> {
    return this.request<CreateFruitResponse>('/api/fruits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFruit(id: number, data: UpdateFruitRequest): Promise<Fruit> {
    return this.request<Fruit>(`/api/fruits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFruit(id: number): Promise<DeleteFruitResponse> {
    return this.request<DeleteFruitResponse>(`/api/fruits/${id}`, {
      method: 'DELETE',
    });
  }

  // Todos API methods - Legacy (all todos)
  async getTodos(): Promise<GetTodosResponse> {
    return this.request<GetTodosResponse>('/api/todos');
  }

  async getTodo(id: number): Promise<Todo> {
    return this.request<Todo>(`/api/todos/${id}`);
  }

  async createTodo(data: CreateTodoRequest): Promise<CreateTodoResponse> {
    return this.request<CreateTodoResponse>(
      '/api/todos',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateTodo(id: number, data: UpdateTodoRequest): Promise<Todo> {
    return this.request<Todo>(
      `/api/todos/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteTodo(id: number): Promise<DeleteTodoResponse> {
    return this.request<DeleteTodoResponse>(
      `/api/todos/${id}`,
      {
        method: 'DELETE',
      }
    );
  }

  // User Todos API methods (authenticated)
  async getUserTodos(): Promise<GetTodosResponse> {
    return this.request<GetTodosResponse>('/api/todos/my-todos');
  }

  async createUserTodo(data: CreateTodoRequest): Promise<CreateTodoResponse> {
    return this.request<CreateTodoResponse>(
      '/api/todos/my-todos',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateUserTodo(id: number, data: UpdateTodoRequest): Promise<Todo> {
    return this.request<Todo>(
      `/api/todos/my-todos/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteUserTodo(id: number): Promise<DeleteTodoResponse> {
    return this.request<DeleteTodoResponse>(
      `/api/todos/my-todos/${id}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Images API methods - Legacy (all images)
  async getImages(): Promise<GetImagesResponse> {
    return this.request<GetImagesResponse>('/api/images');
  }

  // Gallery API methods - Authenticated user only
  async getUserGallery(): Promise<GetImagesResponse> {
    return this.request<GetImagesResponse>('/api/images/gallery');
  }

  async createGalleryImage(data: CreateImageRequest): Promise<CreateImageResponse> {
    return this.request<CreateImageResponse>(
      '/api/images/gallery',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Legacy create image method
  async createImage(data: CreateImageRequest): Promise<CreateImageResponse> {
    return this.request<CreateImageResponse>(
      '/api/images',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async uploadImage(imageId: number, file: File): Promise<ImageUploadResponse> {
    const arrayBuffer = await file.arrayBuffer();

    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
    };

    // Add authorization header if token exists
    const token = tokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/images/${imageId}/upload`, {
      method: 'PUT',
      headers,
      body: arrayBuffer,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteImage(id: number): Promise<DeleteImageResponse> {
    return this.request<DeleteImageResponse>(
      `/api/images/${id}`,
      {
        method: 'DELETE',
      }
    );
  }
}

export const apiClient = new ApiClient();
