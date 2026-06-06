import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Group } from '../../types';

export default function GroupListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { groups, recipes, deleteGroup, reorderGroups } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const myGroups = useMemo(
    () => groups.filter(g => g.userId === user?.id),
    [groups, user]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return myGroups;
    return myGroups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  }, [myGroups, search]);

  const handleDelete = (group: Group) => {
    const recipeCount = recipes.filter(r => (r.groupIds || []).includes(group.id) && r.userId === user?.id).length;
    const doDelete = async (keepRecipes: boolean) => {
      try {
        await deleteGroup(group.id, { keepRecipes });
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar el grupo.');
      }
    };
    if (recipeCount === 0) {
      Alert.alert('Eliminar grupo', `¿Eliminar el grupo "${group.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(false) },
      ]);
      return;
    }
    Alert.alert(
      'Eliminar grupo',
      `El grupo "${group.name}" tiene ${recipeCount} receta(s) asociada(s). ¿Qué quieres hacer?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Solo el grupo', onPress: () => doDelete(true) },
        { text: 'Grupo y recetas', style: 'destructive', onPress: () => doDelete(false) },
      ]
    );
  };

  const handleDragEnd = async (data: Group[]) => {
    try {
      await reorderGroups(data.map(g => g.id));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar el orden.');
    }
  };

  const renderRow = (item: Group, count: number, isActive: boolean, onLongPress?: () => void) => (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
      onLongPress={onLongPress}
      delayLongPress={250}
      activeOpacity={0.7}
    >
      <View style={[styles.colorTag, { backgroundColor: item.color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
        {item.description ? (
          <Text style={styles.cardSub} numberOfLines={1} ellipsizeMode="tail">{item.description}</Text>
        ) : null}
        <Text style={styles.count}>📚 {count} receta{count === 1 ? '' : 's'}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => navigation.navigate('GroupForm', { groupId: item.id })}
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
    </TouchableOpacity>
  );

  const renderDraggable = ({ item, drag, isActive }: RenderItemParams<Group>) => {
    const count = recipes.filter(r => (r.groupIds || []).includes(item.id)).length;
    return renderRow(item, count, isActive, drag);
  };

  const renderStatic = ({ item }: { item: Group }) => {
    const count = recipes.filter(r => (r.groupIds || []).includes(item.id)).length;
    return renderRow(item, count, false);
  };

  const isSearching = !!search.trim();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>📁 Grupos</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('GroupForm', {})}
        >
          <Text style={styles.addBtnText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Buscar grupos..."
        placeholderTextColor="#6B7280"
        value={search}
        onChangeText={setSearch}
      />

      {!isSearching && myGroups.length > 1 && (
        <Text style={styles.hint}>Mantén presionado un grupo para reordenarlo</Text>
      )}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyText}>
            {isSearching ? 'Sin resultados' : 'Aún no tienes grupos'}
          </Text>
          {!isSearching && (
            <Text style={styles.emptyHint}>
              Crea grupos para organizar tus recetas por categorías
            </Text>
          )}
        </View>
      ) : isSearching ? (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderStatic}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <DraggableFlatList
          data={myGroups}
          keyExtractor={item => item.id}
          renderItem={renderDraggable}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onDragEnd={({ data }) => handleDragEnd(data)}
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
  card: {
    backgroundColor: '#1F2937', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 12,
  },
  cardActive: { backgroundColor: '#374151', transform: [{ scale: 1.02 }] },
  colorTag: { width: 8, height: 48, borderRadius: 4 },
  cardTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '700' },
  cardSub: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  count: { color: '#E8735A', fontSize: 12, marginTop: 6, fontWeight: '600' },
  actions: { gap: 4, alignItems: 'center', justifyContent: 'center' },
  actionTouchable: { padding: 10, borderRadius: 8 },
  actionBtn: { fontSize: 22 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 16, fontWeight: '600' },
  emptyHint: { color: '#6B7280', fontSize: 13, marginTop: 8, textAlign: 'center' },
});
