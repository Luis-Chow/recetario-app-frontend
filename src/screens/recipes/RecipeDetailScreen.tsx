import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image,
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
  const { recipes, groups, deleteRecipe } = useData();
  const { user } = useAuth();

  const recipe = recipes.find(r => r.id === recipeId);
  const recipeGroups = recipe
    ? groups.filter(g => (recipe.groupIds || []).includes(g.id))
    : [];
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

  const isOwner = recipe.userId === user?.id;

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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Volver</Text>
          </TouchableOpacity>
          {isOwner && (
            <View style={styles.topActions}>
              <TouchableOpacity onPress={() => navigation.navigate('RecipeForm', { recipeId: recipe.id })}>
                <Text style={styles.topBtn}>✏️ Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <Text style={[styles.topBtn, { color: '#EF4444' }]}>🗑️ Eliminar</Text>
              </TouchableOpacity>
            </View>
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
              {recipe.userId === user?.id ? 'Tu receta' : `por ${recipe.author.name}`}
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

        {recipeGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📁 Grupos</Text>
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
          {recipe.ingredients.map((ing, i) => (
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
          {recipe.steps.map((step, i) => (
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
  groupsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupChip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  groupChipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
