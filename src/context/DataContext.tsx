import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Recipe, Group } from '../types';
import { api, ApiError } from '../services/api';
import { useAuth } from './AuthContext';

interface DataContextType {
  recipes: Recipe[];
  groups: Group[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'userId'>) => Promise<Recipe>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  addGroup: (group: Omit<Group, 'id' | 'createdAt' | 'userId'>) => Promise<Group>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string, opts?: { keepRecipes?: boolean }) => Promise<void>;
  removeRecipeFromGroup: (recipeId: string, groupId: string) => Promise<void>;
  reorderGroups: (ids: string[]) => Promise<void>;
  reorderRecipes: (ids: string[]) => Promise<void>;
  saveRecipe: (recipeId: string, groupIds: string[]) => Promise<void>;
  unsaveRecipe: (recipeId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const refreshData = async () => {
    if (!user) {
      setRecipes([]);
      setGroups([]);
      return;
    }
    try {
      const [r, g] = await Promise.all([api.listRecipes(), api.listGroups()]);
      setRecipes(r.recipes);
      setGroups(g.groups);
    } catch (e) {
      if (e instanceof ApiError) {
        console.warn('[data] refresh fallo:', e.message);
      } else {
        console.warn('[data] refresh fallo:', e);
      }
    }
  };

  useEffect(() => {
    refreshData();
  }, [user?.id]);

  const addRecipe = async (recipe: Omit<Recipe, 'id' | 'createdAt' | 'userId'>) => {
    const { recipe: created } = await api.createRecipe(recipe);
    setRecipes(prev => [...prev, created]);
    return created;
  };

  const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
    const { recipe } = await api.updateRecipe(id, updates);
    setRecipes(prev => prev.map(r => (r.id === id ? recipe : r)));
  };

  const deleteRecipe = async (id: string) => {
    await api.deleteRecipe(id);
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  const addGroup = async (group: Omit<Group, 'id' | 'createdAt' | 'userId'>) => {
    const { group: created } = await api.createGroup(group);
    setGroups(prev => [...prev, created]);
    return created;
  };

  const updateGroup = async (id: string, updates: Partial<Group>) => {
    const { group } = await api.updateGroup(id, updates);
    setGroups(prev => prev.map(g => (g.id === id ? group : g)));
  };

  const deleteGroup = async (id: string, opts?: { keepRecipes?: boolean }) => {
    await api.deleteGroup(id, opts);
    setGroups(prev => prev.filter(g => g.id !== id));
    // El backend puede haber borrado recetas (cascade) o desasociado: refrescar siempre
    const r = await api.listRecipes();
    setRecipes(r.recipes);
  };

  const removeRecipeFromGroup = async (recipeId: string, groupId: string) => {
    const { recipe } = await api.removeRecipeFromGroup(groupId, recipeId);
    setRecipes(prev => prev.map(r => (r.id === recipeId ? recipe : r)));
  };

  const saveRecipe = async (recipeId: string, groupIds: string[]) => {
    await api.saveRecipe(recipeId, groupIds);
    await refreshData();
  };

  const unsaveRecipe = async (recipeId: string) => {
    await api.unsaveRecipe(recipeId);
    await refreshData();
  };

  const reorderGroups = async (ids: string[]) => {
    const optimistic = [...ids]
      .map(id => groups.find(g => g.id === id))
      .filter((g): g is typeof groups[number] => !!g);
    setGroups(optimistic);
    const { groups: reordered } = await api.reorderGroups(ids);
    setGroups(reordered);
  };

  const reorderRecipes = async (ids: string[]) => {
    const optimistic = [...ids]
      .map(id => recipes.find(r => r.id === id))
      .filter((r): r is typeof recipes[number] => !!r);
    const rest = recipes.filter(r => !ids.includes(r.id));
    setRecipes([...optimistic, ...rest]);
    await api.reorderRecipes(ids);
    const refreshed = await api.listRecipes();
    setRecipes(refreshed.recipes);
  };

  return (
    <DataContext.Provider
      value={{
        recipes,
        groups,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        addGroup,
        updateGroup,
        deleteGroup,
        removeRecipeFromGroup,
        reorderGroups,
        reorderRecipes,
        saveRecipe,
        unsaveRecipe,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
