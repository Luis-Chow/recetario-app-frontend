import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Switch, Alert, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Ingredient } from '../../types';
import FormInput from '../../components/FormInput';
import { pickImageFromLibrary } from '../../utils/imagePicker';

type RouteParams = { RecipeForm: { recipeId?: string } };

const MAX_PREP_TIME = 1440; // 24 horas en minutos
const MAX_SERVINGS = 100;

function sanitizeNumber(value: string, max: number): string {
  const digits = value.replace(/\D/g, '');
  if (digits === '') return '';
  return String(Math.min(Number(digits), max));
}

export default function RecipeFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'RecipeForm'>>();
  const { recipeId } = route.params ?? {};
  const { recipes, groups, addRecipe, updateRecipe } = useData();
  const { user } = useAuth();
  const editing = !!recipeId;
  const existing = editing ? recipes.find(r => r.id === recipeId) : undefined;

  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [prepTime, setPrepTime] = useState(existing?.prepTime?.toString() || '');
  const [servings, setServings] = useState(existing?.servings?.toString() || '');
  const [isPublic, setIsPublic] = useState(existing?.isPublic ?? true);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    existing?.ingredients || [{ name: '', quantity: '', unit: '' }]
  );
  const [steps, setSteps] = useState<string[]>(existing?.steps || ['']);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(existing?.groupIds || []);
  const [image, setImage] = useState<string>(existing?.image || '');
  const [images, setImages] = useState<string[]>(existing?.images || []);
  const [pickingImage, setPickingImage] = useState(false);
  const [pickingExtra, setPickingExtra] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const MAX_EXTRA_IMAGES = 5;

  const handlePickImage = async () => {
    setPickingImage(true);
    try {
      const picked = await pickImageFromLibrary(800);
      if (picked) setImage(picked.base64DataUri);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo seleccionar la imagen.');
    } finally {
      setPickingImage(false);
    }
  };

  const handleAddExtraImage = async () => {
    if (images.length >= MAX_EXTRA_IMAGES) {
      Alert.alert('Limite', `Maximo ${MAX_EXTRA_IMAGES} imagenes extra.`);
      return;
    }
    setPickingExtra(true);
    try {
      const picked = await pickImageFromLibrary(800);
      if (picked) setImages(prev => [...prev, picked.base64DataUri]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo seleccionar la imagen.');
    } finally {
      setPickingExtra(false);
    }
  };

  const handleRemoveExtraImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const userGroups = useMemo(
    () => groups.filter(g => g.userId === user?.id).sort((a, b) => a.name.localeCompare(b.name)),
    [groups, user]
  );

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const t = Number(prepTime);
    const s = Number(servings);
    if (!title.trim()) e.title = 'El título es requerido.';
    if (!prepTime || isNaN(t) || t <= 0) e.prepTime = 'Ingresa un tiempo válido.';
    else if (t > MAX_PREP_TIME) e.prepTime = `El tiempo máximo es ${MAX_PREP_TIME} min (24 h).`;
    if (!servings || isNaN(s) || s <= 0) e.servings = 'Ingresa las porciones.';
    else if (s > MAX_SERVINGS) e.servings = `El máximo es ${MAX_SERVINGS} porciones.`;
    if (ingredients.some(i => !i.name.trim())) e.ingredients = 'Completa todos los ingredientes.';
    if (steps.some(s => !s.trim())) e.steps = 'Completa todos los pasos.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        image,
        images,
        prepTime: Math.min(Number(prepTime), MAX_PREP_TIME),
        servings: Math.min(Number(servings), MAX_SERVINGS),
        isPublic,
        ingredients: ingredients.filter(i => i.name.trim()),
        steps: steps.filter(s => s.trim()),
        groupIds: selectedGroupIds,
      };
      if (editing && recipeId) {
        await updateRecipe(recipeId, data);
      } else {
        await addRecipe(data);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar la receta.');
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof Ingredient, val: string) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], [field]: val };
    setIngredients(updated);
  };

  const addStep = () => setSteps([...steps, '']);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, val: string) => {
    const updated = [...steps];
    updated[i] = val;
    setSteps(updated);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.back}>← Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>{editing ? 'Editar Receta' : 'Nueva Receta'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text style={styles.save}>{loading ? '...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📷 Imagen principal</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} disabled={pickingImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  {pickingImage ? (
                    <ActivityIndicator color="#E8735A" />
                  ) : (
                    <>
                      <Text style={styles.imagePlaceholderIcon}>🖼️</Text>
                      <Text style={styles.imagePlaceholderText}>Toca para añadir foto</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
            {image ? (
              <TouchableOpacity onPress={() => setImage('')} style={styles.imageRemove}>
                <Text style={styles.imageRemoveText}>Quitar imagen</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🖼️ Más fotos ({images.length}/{MAX_EXTRA_IMAGES})</Text>
            <Text style={styles.helperText}>Resultado final, paso a paso o cualquier extra.</Text>
            <View style={styles.extraImagesGrid}>
              {images.map((img, idx) => (
                <View key={idx} style={styles.extraImageWrap}>
                  <Image source={{ uri: img }} style={styles.extraImage} />
                  <TouchableOpacity
                    style={styles.extraRemove}
                    onPress={() => handleRemoveExtraImage(idx)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.extraRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < MAX_EXTRA_IMAGES && (
                <TouchableOpacity
                  style={styles.extraAddBtn}
                  onPress={handleAddExtraImage}
                  disabled={pickingExtra}
                >
                  {pickingExtra ? (
                    <ActivityIndicator color="#E8735A" />
                  ) : (
                    <Text style={styles.extraAddText}>+</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <FormInput label="Título *" value={title} onChangeText={setTitle} placeholder="Ej. Tacos de pollo" maxLength={80} error={errors.title} />
            <FormInput label="Descripción" value={description} onChangeText={setDescription} placeholder="Breve descripción (opcional)" multiline numberOfLines={3} maxLength={1000} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FormInput label="Tiempo (min) *" value={prepTime} onChangeText={v => setPrepTime(sanitizeNumber(v, MAX_PREP_TIME))} keyboardType="numeric" maxLength={4} placeholder="1–1440 (24 h)" error={errors.prepTime} />
              </View>
              <View style={{ flex: 1 }}>
                <FormInput label="Porciones *" value={servings} onChangeText={v => setServings(sanitizeNumber(v, MAX_SERVINGS))} keyboardType="numeric" maxLength={3} placeholder="1–100" error={errors.servings} />
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Receta pública</Text>
              <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: '#E8735A' }} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📁 Grupos</Text>
            {userGroups.length === 0 ? (
              <Text style={styles.helperText}>
                Aún no tienes grupos. Crea grupos desde la pestaña "Grupos" para organizar tus recetas.
              </Text>
            ) : (
              <View style={styles.groupsWrap}>
                {userGroups.map(g => {
                  const selected = selectedGroupIds.includes(g.id);
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.groupChip,
                        selected && { backgroundColor: g.color, borderColor: g.color },
                      ]}
                      onPress={() => toggleGroup(g.id)}
                    >
                      <View style={[styles.groupDot, { backgroundColor: selected ? '#fff' : g.color }]} />
                      <Text style={[styles.groupChipText, selected && { color: '#fff' }]}>
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛒 Ingredientes</Text>
            {errors.ingredients && <Text style={styles.errorText}>{errors.ingredients}</Text>}
            {ingredients.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <FormInput
                  label="" value={ing.name} onChangeText={v => updateIngredient(i, 'name', v)}
                  placeholder="Ingrediente" maxLength={60} containerStyle={{ flex: 2 }}
                />
                <FormInput
                  label="" value={ing.quantity} onChangeText={v => updateIngredient(i, 'quantity', v)}
                  placeholder="Cant." keyboardType="numeric" maxLength={10} containerStyle={{ flex: 1 }}
                />
                <FormInput
                  label="" value={ing.unit} onChangeText={v => updateIngredient(i, 'unit', v)}
                  placeholder="Unidad" maxLength={20} containerStyle={{ flex: 1 }}
                />
                {ingredients.length > 1 && (
                  <TouchableOpacity onPress={() => removeIngredient(i)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addRowBtn} onPress={addIngredient}>
              <Text style={styles.addRowBtnText}>+ Añadir ingrediente</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Pasos</Text>
            {errors.steps && <Text style={styles.errorText}>{errors.steps}</Text>}
            {steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <FormInput
                  label=""
                  value={step}
                  onChangeText={v => updateStep(i, v)}
                  placeholder={`Paso ${i + 1}...`}
                  multiline
                  maxLength={500}
                  containerStyle={{ flex: 1 }}
                />
                {steps.length > 1 && (
                  <TouchableOpacity onPress={() => removeStep(i)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addRowBtn} onPress={addStep}>
              <Text style={styles.addRowBtnText}>+ Añadir paso</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveBtnLarge, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveBtnLargeText}>
              {loading ? 'Guardando...' : editing ? '💾 Guardar cambios' : '💾 Crear receta'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  container: { padding: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  back: { color: '#9CA3AF', fontSize: 15 },
  heading: { color: '#F9FAFB', fontSize: 18, fontWeight: '800' },
  save: { color: '#E8735A', fontSize: 15, fontWeight: '700' },
  section: { backgroundColor: '#1F2937', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  switchLabel: { color: '#D1D5DB', fontSize: 14, fontWeight: '600' },
  helperText: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' },
  groupsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#374151', backgroundColor: '#374151',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8,
  },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupChipText: { color: '#D1D5DB', fontSize: 13, fontWeight: '600' },
  ingredientRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 4 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8735A',
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  stepNumText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  removeBtn: { padding: 8 },
  removeBtnText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
  addRowBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#374151', borderStyle: 'dashed' },
  addRowBtnText: { color: '#E8735A', fontWeight: '600', fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 8 },
  imagePicker: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#111827' },
  imagePreview: { width: '100%', height: 200, resizeMode: 'cover' },
  imagePlaceholder: {
    width: '100%', height: 160, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#374151', borderStyle: 'dashed', borderRadius: 12,
  },
  imagePlaceholderIcon: { fontSize: 32, marginBottom: 4 },
  imagePlaceholderText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  imageRemove: { marginTop: 8, alignItems: 'center' },
  extraImagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  extraImageWrap: { width: 88, height: 88, borderRadius: 10, overflow: 'hidden' },
  extraImage: { width: '100%', height: '100%' },
  extraRemove: {
    position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)',
    width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center',
  },
  extraRemoveText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  extraAddBtn: {
    width: 88, height: 88, borderRadius: 10, borderWidth: 1, borderColor: '#374151',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  extraAddText: { color: '#E8735A', fontSize: 36, fontWeight: '300' },
  imageRemoveText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  saveBtnLarge: {
    backgroundColor: '#E8735A', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnLargeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
