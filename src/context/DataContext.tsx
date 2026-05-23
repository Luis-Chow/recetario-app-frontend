import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, Group } from '../types';

interface DataContextType {
  recipes: Recipe[];
  groups: Group[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Promise<Recipe>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  addGroup: (group: Omit<Group, 'id' | 'createdAt'>) => Promise<Group>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  removeRecipeFromGroup: (recipeId: string, groupId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const RECIPES_KEY = 'recetas_recipes';
const GROUPS_KEY = 'recetas_groups';

export function DataProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const refreshData = async () => {
    const r = await AsyncStorage.getItem(RECIPES_KEY);
    const g = await AsyncStorage.getItem(GROUPS_KEY);
    if (r) {
      const parsed: Recipe[] = JSON.parse(r);
      const migrated = parsed.map(rec => ({ ...rec, groupIds: rec.groupIds || [] }));
      setRecipes(migrated);
    }
    if (g) setGroups(JSON.parse(g));
  };

  useEffect(() => { refreshData(); }, []);

  const saveRecipes = async (updated: Recipe[]) => {
    setRecipes(updated);
    await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(updated));
  };

  const saveGroups = async (updated: Group[]) => {
    setGroups(updated);
    await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(updated));
  };

  const addRecipe = async (recipe: Omit<Recipe, 'id' | 'createdAt'>) => {
    const newRecipe: Recipe = {
      ...recipe,
      groupIds: recipe.groupIds || [],
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const current: Recipe[] = JSON.parse((await AsyncStorage.getItem(RECIPES_KEY)) || '[]');
    await saveRecipes([...current, newRecipe]);
    return newRecipe;
  };

  const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
    const current: Recipe[] = JSON.parse((await AsyncStorage.getItem(RECIPES_KEY)) || '[]');
    await saveRecipes(current.map(r => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteRecipe = async (id: string) => {
    const current: Recipe[] = JSON.parse((await AsyncStorage.getItem(RECIPES_KEY)) || '[]');
    await saveRecipes(current.filter(r => r.id !== id));
  };

  const addGroup = async (group: Omit<Group, 'id' | 'createdAt'>) => {
    const newGroup: Group = {
      ...group,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const current: Group[] = JSON.parse((await AsyncStorage.getItem(GROUPS_KEY)) || '[]');
    await saveGroups([...current, newGroup]);
    return newGroup;
  };

  const updateGroup = async (id: string, updates: Partial<Group>) => {
    const current: Group[] = JSON.parse((await AsyncStorage.getItem(GROUPS_KEY)) || '[]');
    await saveGroups(current.map(g => (g.id === id ? { ...g, ...updates } : g)));
  };

  const deleteGroup = async (id: string) => {
    const currentGroups: Group[] = JSON.parse((await AsyncStorage.getItem(GROUPS_KEY)) || '[]');
    const currentRecipes: Recipe[] = JSON.parse((await AsyncStorage.getItem(RECIPES_KEY)) || '[]');
    await saveGroups(currentGroups.filter(g => g.id !== id));
    await saveRecipes(currentRecipes.filter(r => !(r.groupIds || []).includes(id)));
  };

  const removeRecipeFromGroup = async (recipeId: string, groupId: string) => {
    const current: Recipe[] = JSON.parse((await AsyncStorage.getItem(RECIPES_KEY)) || '[]');
    await saveRecipes(
      current.map(r =>
        r.id === recipeId
          ? { ...r, groupIds: (r.groupIds || []).filter(gid => gid !== groupId) }
          : r
      )
    );
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
