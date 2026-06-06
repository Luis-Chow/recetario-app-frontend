import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Recipe, Group, User } from '../types';

const DEFAULT_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE).replace(/\/$/, '') + '/api';

const TOKEN_KEY = 'recetas_token';

let cachedToken: string | null | undefined = undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, 'No se pudo conectar con el servidor.');
  }

  const text = await res.text();
  let data: any = {};
  if (text) {
    try { data = JSON.parse(text); } catch { data = { error: text }; }
  }
  if (!res.ok) {
    throw new ApiError(res.status, data.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export interface AuthResponse { user: User; token: string }
export interface UserResponse { user: User }
export interface RecipeResponse { recipe: Recipe }
export interface RecipesResponse { recipes: Recipe[] }
export interface GroupResponse { group: Group }
export interface GroupsResponse { groups: Group[] }

export const api = {
  baseUrl: BASE_URL,

  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('POST', '/auth/register', { name, email, password }),

  login: (email: string, password: string) =>
    request<AuthResponse>('POST', '/auth/login', { email, password }),

  getMe: () => request<UserResponse>('GET', '/users/me'),

  updateMe: (updates: Partial<Pick<User, 'name' | 'email' | 'avatar'>> & { password?: string; currentPassword?: string }) =>
    request<UserResponse>('PATCH', '/users/me', updates),

  deleteMe: () => request<{ ok: true }>('DELETE', '/users/me'),

  listRecipes: (params?: { mine?: boolean; groupId?: string }) => {
    const q: string[] = [];
    if (params?.mine) q.push('mine=true');
    if (params?.groupId) q.push(`groupId=${encodeURIComponent(params.groupId)}`);
    const qs = q.length ? `?${q.join('&')}` : '';
    return request<RecipesResponse>('GET', `/recipes${qs}`);
  },

  createRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'userId'>) =>
    request<RecipeResponse>('POST', '/recipes', recipe),

  updateRecipe: (id: string, updates: Partial<Recipe>) =>
    request<RecipeResponse>('PATCH', `/recipes/${id}`, updates),

  deleteRecipe: (id: string) => request<{ ok: true }>('DELETE', `/recipes/${id}`),

  listGroups: () => request<GroupsResponse>('GET', '/groups'),

  createGroup: (group: Omit<Group, 'id' | 'createdAt' | 'userId'>) =>
    request<GroupResponse>('POST', '/groups', group),

  updateGroup: (id: string, updates: Partial<Group>) =>
    request<GroupResponse>('PATCH', `/groups/${id}`, updates),

  deleteGroup: (id: string) => request<{ ok: true }>('DELETE', `/groups/${id}`),

  removeRecipeFromGroup: (groupId: string, recipeId: string) =>
    request<RecipeResponse>('DELETE', `/groups/${groupId}/recipes/${recipeId}`),

  reorderGroups: (ids: string[]) =>
    request<GroupsResponse>('POST', '/groups/reorder', { ids }),

  saveRecipe: (recipeId: string, groupIds: string[]) =>
    request<{ saved: { id: string; recipeId: string; groupIds: string[] } }>(
      'POST', `/recipes/${recipeId}/save`, { groupIds }
    ),

  unsaveRecipe: (recipeId: string) =>
    request<{ ok: true }>('DELETE', `/recipes/${recipeId}/save`),
};
