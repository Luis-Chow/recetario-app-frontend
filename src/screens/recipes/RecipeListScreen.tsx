import React, { useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Recipe } from '../../types';

type RouteParams = { RecipeList: { personal?: boolean } };

export default function RecipeListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'RecipeList'>>();
  const personal = route.params?.personal ?? false;
  const { recipes, groups, deleteRecipe, unsaveRecipe, reorderRecipes } = useData();
  const { user } = useAuth();
  const [search, setSearch] = React.useState('');
  const insets = useSafeAreaInsets();
  const listBottomPad = 80 + Math.max(insets.bottom, 12);

  const ownedSorted = useMemo(() => {
    if (!personal || !user) return [];
    return recipes
      .filter(r => r.userId === user.id)
      .sort((a, b) => {
        const ao = a.order || 0;
        const bo = b.order || 0;
        if (ao === 0 && bo === 0) return a.title.localeCompare(b.title);
        if (ao === 0) return 1;
        if (bo === 0) return -1;
        return ao - bo;
      });
  }, [recipes, personal, user]);

  const savedSorted = useMemo(() => {
    if (!personal || !user) return [];
    return recipes
      .filter(r => r.isSaved && r.userId !== user.id)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [recipes, personal, user]);

  const filtered = useMemo(() => {
    let list = personal
      ? [...ownedSorted, ...savedSorted]
      : [...recipes].sort((a, b) => a.title.localeCompare(b.title));
    if (search.trim()) {
      list = list.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [recipes, personal, search, ownedSorted, savedSorted]);

  const handleOwnedDragEnd = async (data: Recipe[]) => {
    try {
      await reorderRecipes(data.map(r => r.id));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar el orden.');
    }
  };

  const handleDelete = (recipe: Recipe) => {
    Alert.alert('Eliminar receta', `¿Eliminar "${recipe.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await deleteRecipe(recipe.id);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar la receta.');
          }
        }
      },
    ]);
  };

  const handleUnsave = (recipe: Recipe) => {
    Alert.alert(
      'Quitar de mis recetas',
      `¿Quitar "${recipe.title}" de tus recetas guardadas? La receta original no se borrará.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar', style: 'destructive', onPress: async () => {
            try {
              await unsaveRecipe(recipe.id);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo quitar la receta.');
            }
          }
        },
      ]
    );
  };

  const renderCard = (item: Recipe, onLongPress?: () => void, isDragActive?: boolean) => {
    const itemGroups = groups.filter(g => (item.groupIds || []).includes(g.id));
    const isOwn = item.userId === user?.id;
    const isSaved = !!item.isSaved && !isOwn;
    return (
    <View style={[styles.card, isDragActive && styles.cardActive]}>
      <TouchableOpacity
        style={styles.cardLeft}
        onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
        onLongPress={onLongPress}
        delayLongPress={250}
        activeOpacity={0.7}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.thumb} />
        ) : (
          <Text style={styles.emoji}>🍽️</Text>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
            {isSaved && <Text style={styles.savedBadge}>📌</Text>}
          </View>
          {!isOwn && item.author?.name ? (
            <Text style={styles.cardAuthor} numberOfLines={1} ellipsizeMode="tail">por {item.author.name}</Text>
          ) : null}
          <Text style={styles.cardSub} numberOfLines={1} ellipsizeMode="tail">{item.description || 'Sin descripción'}</Text>
          <View style={styles.tags}>
            <Text style={styles.tag}>⏱ {item.prepTime} min</Text>
            <Text style={styles.tag}>🍴 {item.servings} porciones</Text>
            {!item.isPublic && <Text style={[styles.tag, styles.privateTag]}>🔒 Privada</Text>}
          </View>
          {itemGroups.length > 0 && (
            <View style={styles.groupsRow}>
              {itemGroups.slice(0, 3).map(g => (
                <View key={g.id} style={[styles.groupPill, { backgroundColor: g.color }]}>
                  <Text style={styles.groupPillText} numberOfLines={1}>{g.name}</Text>
                </View>
              ))}
              {itemGroups.length > 3 && (
                <Text style={styles.moreGroups}>+{itemGroups.length - 3}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
      {isOwn ? (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('RecipeForm', { recipeId: item.id })}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.actionTouchable}
          >
            <Text style={styles.actionBtn}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.actionTouchable}
          >
            <Text style={styles.actionBtn}>🗑️</Text>
          </TouchableOpacity>
        </View>
      ) : isSaved ? (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleUnsave(item)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.actionTouchable}
          >
            <Text style={styles.actionBtn}>🗑️</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
    );
  };

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

      {personal && !search.trim() && ownedSorted.length > 1 && (
        <Text style={styles.hint}>Mantén presionada una receta para reordenarla</Text>
      )}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>
            {search ? 'Sin resultados' : personal ? 'Aún no tienes recetas' : 'No hay recetas'}
          </Text>
        </View>
      ) : personal && !search.trim() ? (
        <DraggableFlatList
          data={ownedSorted}
          keyExtractor={item => item.id}
          renderItem={({ item, drag, isActive }: RenderItemParams<Recipe>) =>
            renderCard(item, drag, isActive)
          }
          onDragEnd={({ data }) => handleOwnedDragEnd(data)}
          contentContainerStyle={{ padding: 16, paddingBottom: savedSorted.length > 0 ? 8 : listBottomPad, gap: 12 }}
          ListFooterComponent={
            savedSorted.length > 0 ? (
              <View>
                <Text style={styles.sectionHeader}>📌 Guardadas</Text>
                {savedSorted.map(item => (
                  <View key={item.id} style={{ marginBottom: 12 }}>
                    {renderCard(item)}
                  </View>
                ))}
                <View style={{ height: listBottomPad }} />
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderCard(item)}
          contentContainerStyle={{ padding: 16, paddingBottom: listBottomPad, gap: 12 }}
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
  hint: { color: '#6B7280', fontSize: 12, paddingHorizontal: 20, paddingTop: 4, fontStyle: 'italic' },
  cardActive: { backgroundColor: '#374151', transform: [{ scale: 1.02 }] },
  sectionHeader: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 8, letterSpacing: 0.5 },
  card: {
    backgroundColor: '#1F2937', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  cardLeft: { flexDirection: 'row', flex: 1, gap: 12, alignItems: 'center' },
  emoji: { fontSize: 32, width: 48, textAlign: 'center' },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#374151' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '700', flex: 1 },
  savedBadge: { fontSize: 14 },
  cardAuthor: { color: '#E8735A', fontSize: 11, fontWeight: '600', marginTop: 1 },
  cardSub: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  tags: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  tag: { color: '#D1D5DB', fontSize: 11, backgroundColor: '#374151', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  privateTag: { backgroundColor: '#4B2020', color: '#FCA5A5' },
  groupsRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' },
  groupPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, maxWidth: 100 },
  groupPillText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  moreGroups: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  actions: { gap: 4, alignItems: 'center', justifyContent: 'center' },
  actionTouchable: { padding: 10, borderRadius: 8 },
  actionBtn: { fontSize: 22 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#6B7280', fontSize: 16 },
});
