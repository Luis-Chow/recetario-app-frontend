import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Modal, FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import ExpandableText from '../../components/ExpandableText';

type RouteParams = { RecipeDetail: { recipeId: string } };

export default function RecipeDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'RecipeDetail'>>();
  const { recipeId } = route.params;
  const { recipes, groups, deleteRecipe, saveRecipe, unsaveRecipe } = useData();
  const { user } = useAuth();

  const recipe = recipes.find(r => r.id === recipeId);
  const isOwner = recipe?.userId === user?.id;
  const isSaved = !!recipe?.isSaved && !isOwner;
  const userGroups = useMemo(
    () => groups.filter(g => g.userId === user?.id).sort((a, b) => a.name.localeCompare(b.name)),
    [groups, user]
  );
  const recipeGroups = useMemo(
    () => recipe ? groups.filter(g => (recipe.groupIds || []).includes(g.id)) : [],
    [recipe, groups]
  );

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [pickedGroupIds, setPickedGroupIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Receta no encontrada</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert('Eliminar receta', `¿Eliminar "${recipe.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await deleteRecipe(recipe.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar la receta.');
          }
        }
      },
    ]);
  };

  const openSaveModal = () => {
    setPickedGroupIds(isSaved ? recipe.groupIds || [] : []);
    setSaveModalOpen(true);
  };

  const toggleGroup = (id: string) => {
    setPickedGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const confirmSave = async () => {
    setSaving(true);
    try {
      await saveRecipe(recipe.id, pickedGroupIds);
      setSaveModalOpen(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar la receta.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnsave = () => {
    Alert.alert(
      'Quitar de mis recetas',
      'La receta original no se borrará. ¿Continuar?',
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.back}>← Volver</Text>
          </TouchableOpacity>
          {isOwner ? (
            <View style={styles.topActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate('RecipeForm', { recipeId: recipe.id })}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.topBtn}>✏️ Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.topBtn, { color: '#EF4444' }]}>🗑️ Eliminar</Text>
              </TouchableOpacity>
            </View>
          ) : isSaved ? (
            <View style={styles.topActions}>
              <TouchableOpacity onPress={openSaveModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.topBtn}>📁 Grupos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUnsave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={[styles.topBtn, { color: '#EF4444' }]}>📌 Quitar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={openSaveModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.topBtn, { color: '#10B981' }]}>💾 Guardar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.hero}>
          {recipe.image ? (
            <Image source={{ uri: recipe.image }} style={styles.heroImage} />
          ) : (
            <Text style={styles.heroEmoji}>🍽️</Text>
          )}
          <Text style={styles.heroTitle}>{recipe.title}</Text>
          {recipe.author?.name ? (
            <Text style={styles.heroAuthor}>
              {isOwner ? 'Tu receta' : `por ${recipe.author.name}`}
              {isSaved && '  •  📌 Guardada'}
            </Text>
          ) : null}
          {recipe.description ? (
            <ExpandableText
              text={recipe.description}
              style={styles.heroDesc}
              numberOfLines={3}
              align="center"
            />
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaValue}>⏱ {recipe.prepTime}</Text>
              <Text style={styles.metaLabel}>minutos</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaValue}>🍴 {recipe.servings}</Text>
              <Text style={styles.metaLabel}>porciones</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaValue}>{recipe.isPublic ? '🌍' : '🔒'}</Text>
              <Text style={styles.metaLabel}>{recipe.isPublic ? 'Pública' : 'Privada'}</Text>
            </View>
          </View>
        </View>

        {recipe.images && recipe.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Galería</Text>
            <FlatList
              data={recipe.images}
              keyExtractor={(_, i) => String(i)}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.galleryImg} />
              )}
              ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
              contentContainerStyle={{ paddingRight: 20 }}
            />
          </View>
        )}

        {recipeGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📁 {isSaved ? 'Tus grupos' : 'Grupos'}</Text>
            <View style={styles.groupsWrap}>
              {recipeGroups.map(g => (
                <View
                  key={g.id}
                  style={[styles.groupChip, { backgroundColor: g.color }]}
                >
                  <Text style={styles.groupChipText}>{g.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛒 Ingredientes</Text>
          {(recipe.ingredients || []).map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <View style={styles.bullet} />
              <Text style={styles.ingredientText}>
                <Text style={{ fontWeight: '700' }}>{ing.quantity} {ing.unit}</Text>
                {ing.name ? `  ${ing.name}` : ''}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Pasos</Text>
          {(recipe.steps || []).map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={saveModalOpen} transparent animationType="slide" onRequestClose={() => setSaveModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {isSaved ? '📁 Editar grupos' : '💾 Guardar receta'}
            </Text>
            <Text style={styles.modalSub}>
              {isSaved
                ? 'Cambia los grupos donde aparece esta receta en tus recetas.'
                : '¿En cuáles de tus grupos quieres organizarla? (opcional)'}
            </Text>
            {userGroups.length === 0 ? (
              <Text style={styles.modalHint}>
                Aún no tienes grupos. Puedes guardar sin grupo y asociarla luego.
              </Text>
            ) : (
              <View style={styles.groupsWrap}>
                {userGroups.map(g => {
                  const selected = pickedGroupIds.includes(g.id);
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.modalChip, selected && { backgroundColor: g.color, borderColor: g.color }]}
                      onPress={() => toggleGroup(g.id)}
                    >
                      <View style={[styles.modalDot, { backgroundColor: selected ? '#fff' : g.color }]} />
                      <Text style={[styles.modalChipText, selected && { color: '#fff' }]}>{g.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setSaveModalOpen(false)}
                disabled={saving}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, saving && { opacity: 0.6 }]}
                onPress={confirmSave}
                disabled={saving}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {saving ? 'Guardando...' : isSaved ? 'Actualizar' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 16, marginBottom: 12 },
  link: { color: '#E8735A', fontSize: 15 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  back: { color: '#E8735A', fontSize: 16, fontWeight: '600' },
  topActions: { flexDirection: 'row', gap: 16 },
  topBtn: { color: '#E8735A', fontSize: 15, fontWeight: '600' },
  hero: { paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  heroEmoji: { fontSize: 60, marginBottom: 12 },
  heroImage: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16, backgroundColor: '#374151' },
  heroTitle: { color: '#F9FAFB', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  heroAuthor: { color: '#E8735A', fontSize: 13, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  heroDesc: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  metaCard: { flex: 1, backgroundColor: '#1F2937', borderRadius: 12, padding: 12, alignItems: 'center' },
  metaValue: { color: '#F9FAFB', fontSize: 16, fontWeight: '700' },
  metaLabel: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  section: { marginHorizontal: 20, marginBottom: 24 },
  sectionTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8735A' },
  ingredientText: { color: '#D1D5DB', fontSize: 14, flex: 1 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8735A',
    justifyContent: 'center', alignItems: 'center',
  },
  stepNumText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stepText: { color: '#D1D5DB', fontSize: 14, flex: 1, lineHeight: 21, paddingTop: 4 },
  galleryImg: { width: Dimensions.get('window').width * 0.7, height: 200, borderRadius: 12, backgroundColor: '#374151' },
  groupsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupChip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  groupChipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1F2937', borderRadius: 16, padding: 24 },
  modalTitle: { color: '#F9FAFB', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  modalSub: { color: '#9CA3AF', fontSize: 13, marginBottom: 16 },
  modalHint: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', marginBottom: 16 },
  modalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#374151', backgroundColor: '#374151',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8,
  },
  modalDot: { width: 10, height: 10, borderRadius: 5 },
  modalChipText: { color: '#D1D5DB', fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalBtnPrimary: { backgroundColor: '#10B981' },
  modalBtnSecondary: { backgroundColor: '#374151' },
  modalBtnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalBtnSecondaryText: { color: '#D1D5DB', fontSize: 15, fontWeight: '700' },
});
