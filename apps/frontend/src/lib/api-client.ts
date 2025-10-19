import type {
  GetItemsResponse,
  CreateItemRequest,
  CreateItemResponse,
  DeleteItemResponse,
  HealthCheckResponse,
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
}

export const apiClient = new ApiClient();
