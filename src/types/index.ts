export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  prepTime: number;
  servings: number;
  isPublic: boolean;
  groupIds: string[];
  createdAt: string;
}

export interface Group {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  AllRecipes: undefined;
  MyRecipes: undefined;
  Groups: undefined;
  Profile: undefined;
};
