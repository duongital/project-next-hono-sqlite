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

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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
  async getTodos(token: string): Promise<GetTodosResponse> {
    return this.request<GetTodosResponse>('/api/todos', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getTodo(id: number, token: string): Promise<Todo> {
    return this.request<Todo>(`/api/todos/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createTodo(data: CreateTodoRequest, token: string): Promise<CreateTodoResponse> {
    return this.request<CreateTodoResponse>('/api/todos', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateTodo(id: number, data: UpdateTodoRequest, token: string): Promise<Todo> {
    return this.request<Todo>(`/api/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async deleteTodo(id: number, token: string): Promise<DeleteTodoResponse> {
    return this.request<DeleteTodoResponse>(`/api/todos/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Images API methods (requires authentication)
  async getImages(token: string): Promise<GetImagesResponse> {
    return this.request<GetImagesResponse>('/api/images', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createImage(data: CreateImageRequest, token: string): Promise<CreateImageResponse> {
    return this.request<CreateImageResponse>('/api/images', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async uploadImage(imageId: number, file: File, token: string): Promise<ImageUploadResponse> {
    const arrayBuffer = await file.arrayBuffer();

    const response = await fetch(`${this.baseUrl}/api/images/${imageId}/upload`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteImage(id: number, token: string): Promise<DeleteImageResponse> {
    return this.request<DeleteImageResponse>(`/api/images/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const apiClient = new ApiClient();
