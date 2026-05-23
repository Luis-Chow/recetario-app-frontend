import React, { useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Recipe } from '../../types';

type RouteParams = { RecipeList: { personal?: boolean } };

export default function RecipeListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'RecipeList'>>();
  const personal = route.params?.personal ?? false;
  const { recipes, deleteRecipe } = useData();
  const { user } = useAuth();
  const [search, setSearch] = React.useState('');

  const filtered = useMemo(() => {
    let list = personal ? recipes.filter(r => r.userId === user?.id) : recipes;
    if (search.trim()) {
      list = list.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));
    }
    return [...list].sort((a, b) => a.title.localeCompare(b.title));
  }, [recipes, personal, user, search]);

  const handleDelete = (recipe: Recipe) => {
    Alert.alert('Eliminar receta', `¿Eliminar "${recipe.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteRecipe(recipe.id) },
    ]);
  };

  const renderItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.emoji}>🍽️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{item.description || 'Sin descripción'}</Text>
          <View style={styles.tags}>
            <Text style={styles.tag}>⏱ {item.prepTime} min</Text>
            <Text style={styles.tag}>🍴 {item.servings} porciones</Text>
            {!item.isPublic && <Text style={[styles.tag, styles.privateTag]}>🔒 Privada</Text>}
          </View>
        </View>
      </View>
      {item.userId === user?.id && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.navigate('RecipeForm', { recipeId: item.id })}>
            <Text style={styles.actionBtn}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.actionBtn}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{personal ? '👨‍🍳 Mis Recetas' : '🌍 Todas las Recetas'}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('RecipeForm', {})}
        >
          <Text style={styles.addBtnText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Buscar recetas..."
        placeholderTextColor="#6B7280"
        value={search}
        onChangeText={setSearch}
      />

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>
            {search ? 'Sin resultados' : personal ? 'Aún no tienes recetas' : 'No hay recetas'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: '800' },
  addBtn: { backgroundColor: '#E8735A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  search: {
    backgroundColor: '#1F2937', color: '#F9FAFB', borderRadius: 10,
    marginHorizontal: 16, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
  },
  card: {
    backgroundColor: '#1F2937', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  cardLeft: { flexDirection: 'row', flex: 1, gap: 12, alignItems: 'center' },
  emoji: { fontSize: 32 },
  cardTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '700' },
  cardSub: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  tags: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  tag: { color: '#D1D5DB', fontSize: 11, backgroundColor: '#374151', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  privateTag: { backgroundColor: '#4B2020', color: '#FCA5A5' },
  actions: { gap: 8 },
  actionBtn: { fontSize: 20, padding: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#6B7280', fontSize: 16 },
});
