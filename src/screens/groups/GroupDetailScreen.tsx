import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useData } from '../../context/DataContext';
import { Recipe } from '../../types';
import ExpandableText from '../../components/ExpandableText';

type RouteParams = { GroupDetail: { groupId: string } };

export default function GroupDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'GroupDetail'>>();
  const { groupId } = route.params;
  const { groups, recipes, deleteGroup, removeRecipeFromGroup } = useData();

  const group = groups.find(g => g.id === groupId);

  const groupRecipes = useMemo(() => {
    if (!group) return [];
    return recipes
      .filter(r => (r.groupIds || []).includes(group.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [recipes, group]);

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Grupo no encontrado</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    const count = groupRecipes.length;
    const doDelete = async (keepRecipes: boolean) => {
      try {
        await deleteGroup(group.id, { keepRecipes });
        navigation.goBack();
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar el grupo.');
      }
    };
    if (count === 0) {
      Alert.alert('Eliminar grupo', `¿Eliminar el grupo "${group.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(false) },
      ]);
      return;
    }
    Alert.alert(
      'Eliminar grupo',
      `El grupo "${group.name}" tiene ${count} receta(s). ¿Qué quieres hacer?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Solo el grupo', onPress: () => doDelete(true) },
        { text: 'Grupo y recetas', style: 'destructive', onPress: () => doDelete(false) },
      ]
    );
  };

  const handleRemoveRecipe = (recipe: Recipe) => {
    Alert.alert(
      'Quitar del grupo',
      `¿Quitar "${recipe.title}" del grupo "${group.name}"? La receta no se eliminará.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar', onPress: async () => {
            try {
              await removeRecipeFromGroup(recipe.id, group.id);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo quitar la receta del grupo.');
            }
          }
        },
      ]
    );
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
    >
      <Text style={styles.recipeEmoji}>🍽️</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.recipeTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.recipeSub} numberOfLines={1}>
          ⏱ {item.prepTime} min · 🍴 {item.servings}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleRemoveRecipe(item)} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Volver</Text>
        </TouchableOpacity>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => navigation.navigate('GroupForm', { groupId: group.id })}>
            <Text style={styles.topBtn}>✏️ Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Text style={[styles.topBtn, { color: '#EF4444' }]}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={[styles.colorBadge, { backgroundColor: group.color }]} />
        <Text style={styles.heroTitle}>{group.name}</Text>
        {group.description ? (
          <ExpandableText
            text={group.description}
            style={styles.heroDesc}
            numberOfLines={3}
            align="center"
          />
        ) : null}
        <Text style={styles.heroCount}>📚 {groupRecipes.length} receta{groupRecipes.length === 1 ? '' : 's'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recetas del grupo</Text>
        {groupRecipes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyText}>Este grupo aún no tiene recetas</Text>
            <Text style={styles.emptyHint}>
              Asigna recetas a este grupo al crearlas o editarlas
            </Text>
          </View>
        ) : (
          <FlatList
            data={groupRecipes}
            keyExtractor={item => item.id}
            renderItem={renderRecipe}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  link: { color: '#E8735A', fontSize: 15 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  back: { color: '#E8735A', fontSize: 16, fontWeight: '600' },
  topActions: { flexDirection: 'row', gap: 16 },
  topBtn: { color: '#E8735A', fontSize: 15, fontWeight: '600' },
  hero: { paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  colorBadge: { width: 60, height: 60, borderRadius: 30, marginBottom: 12 },
  heroTitle: { color: '#F9FAFB', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  heroDesc: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  heroCount: { color: '#E8735A', fontSize: 14, fontWeight: '600', marginTop: 12 },
  section: { flex: 1, marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  recipeCard: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  recipeEmoji: { fontSize: 28 },
  recipeTitle: { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  recipeSub: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  removeBtn: { padding: 8 },
  removeBtnText: { color: '#EF4444', fontSize: 18, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15, fontWeight: '600' },
  emptyHint: { color: '#6B7280', fontSize: 12, marginTop: 6, textAlign: 'center' },
});
