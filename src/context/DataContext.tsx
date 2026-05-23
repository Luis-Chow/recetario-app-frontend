import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types';

interface DataContextType {
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Promise<Recipe>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const RECIPES_KEY = 'recetas_recipes';

export function DataProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const refreshData = async () => {
    const r = await AsyncStorage.getItem(RECIPES_KEY);
    if (r) setRecipes(JSON.parse(r));
  };

  useEffect(() => { refreshData(); }, []);

  const saveRecipes = async (updated: Recipe[]) => {
    setRecipes(updated);
    await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(updated));
  };

  const addRecipe = async (recipe: Omit<Recipe, 'id' | 'createdAt'>) => {
    const newRecipe: Recipe = { ...recipe, id: Date.now().toString(), createdAt: new Date().toISOString() };
    const current = JSON.parse((await AsyncStorage.getItem(RECIPES_KEY)) || '[]');
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

  return (
    <DataContext.Provider value={{ recipes, addRecipe, updateRecipe, deleteRecipe, refreshData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
