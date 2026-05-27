import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Group } from '../../types';

export default function GroupListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { groups, recipes, deleteGroup } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = groups.filter(g => g.userId === user?.id);
    if (search.trim()) {
      list = list.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, user, search]);

  const handleDelete = (group: Group) => {
    const recipeCount = recipes.filter(r => (r.groupIds || []).includes(group.id)).length;
    const message = recipeCount > 0
      ? `Esto eliminará el grupo "${group.name}" y también las ${recipeCount} receta(s) asociadas. ¿Continuar?`
      : `¿Eliminar el grupo "${group.name}"?`;
    Alert.alert('Eliminar grupo', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteGroup(group.id) },
    ]);
  };

  const renderItem = ({ item }: { item: Group }) => {
    const count = recipes.filter(r => (r.groupIds || []).includes(item.id)).length;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
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
          <TouchableOpacity onPress={() => navigation.navigate('GroupForm', { groupId: item.id })}>
            <Text style={styles.actionBtn}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.actionBtn}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

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

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyText}>
            {search ? 'Sin resultados' : 'Aún no tienes grupos'}
          </Text>
          {!search && (
            <Text style={styles.emptyHint}>
              Crea grupos para organizar tus recetas por categorías
            </Text>
          )}
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
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  colorTag: { width: 8, height: 48, borderRadius: 4 },
  cardTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '700' },
  cardSub: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  count: { color: '#E8735A', fontSize: 12, marginTop: 6, fontWeight: '600' },
  actions: { gap: 8 },
  actionBtn: { fontSize: 20, padding: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 16, fontWeight: '600' },
  emptyHint: { color: '#6B7280', fontSize: 13, marginTop: 8, textAlign: 'center' },
});
