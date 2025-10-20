import type {
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

// Helper to get JWT token from Better Auth session stored in cookies/localStorage
async function getAuthToken(): Promise<string | null> {
  try {
    // Better Auth stores the session in cookies by default
    // We'll make a request to get the session which includes the token
    const response = await fetch(`${API_URL}/api/auth/session`, {
      credentials: 'include',
    });

    if (!response.ok) return null;

    const session = await response.json();
    return session?.token || null;
  } catch {
    return null;
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    requiresAuth: boolean = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge existing headers
    if (options?.headers) {
      const existingHeaders = new Headers(options.headers);
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    }

    // Add auth token if required
    if (requiresAuth) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
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

  // Todos API methods (requires authentication)
  async getTodos(): Promise<GetTodosResponse> {
    return this.request<GetTodosResponse>('/api/todos', {}, true);
  }

  async getTodo(id: number): Promise<Todo> {
    return this.request<Todo>(`/api/todos/${id}`, {}, true);
  }

  async createTodo(data: CreateTodoRequest): Promise<CreateTodoResponse> {
    return this.request<CreateTodoResponse>(
      '/api/todos',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true
    );
  }

  async updateTodo(id: number, data: UpdateTodoRequest): Promise<Todo> {
    return this.request<Todo>(
      `/api/todos/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      true
    );
  }

  async deleteTodo(id: number): Promise<DeleteTodoResponse> {
    return this.request<DeleteTodoResponse>(
      `/api/todos/${id}`,
      {
        method: 'DELETE',
      },
      true
    );
  }

  // Images API methods (requires authentication)
  async getImages(): Promise<GetImagesResponse> {
    return this.request<GetImagesResponse>('/api/images', {}, true);
  }

  async createImage(data: CreateImageRequest): Promise<CreateImageResponse> {
    return this.request<CreateImageResponse>(
      '/api/images',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true
    );
  }

  async uploadImage(imageId: number, file: File): Promise<ImageUploadResponse> {
    const arrayBuffer = await file.arrayBuffer();
    const token = await getAuthToken();

    const response = await fetch(`${this.baseUrl}/api/images/${imageId}/upload`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/octet-stream',
      },
      body: arrayBuffer,
      credentials: 'include',
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
      },
      true
    );
  }
}

export const apiClient = new ApiClient();
