import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Ingredient } from '../../types';
import FormInput from '../../components/FormInput';

type RouteParams = { RecipeForm: { recipeId?: string } };

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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
    if (!title.trim()) e.title = 'El título es requerido.';
    if (!prepTime || isNaN(Number(prepTime)) || Number(prepTime) <= 0) e.prepTime = 'Ingresa un tiempo válido.';
    if (!servings || isNaN(Number(servings)) || Number(servings) <= 0) e.servings = 'Ingresa las porciones.';
    if (ingredients.some(i => !i.name.trim())) e.ingredients = 'Completa todos los ingredientes.';
    if (steps.some(s => !s.trim())) e.steps = 'Completa todos los pasos.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    const data = {
      userId: user!.id,
      title: title.trim(),
      description: description.trim(),
      prepTime: Number(prepTime),
      servings: Number(servings),
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
    setLoading(false);
    navigation.goBack();
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
            <FormInput label="Título *" value={title} onChangeText={setTitle} placeholder="Ej. Tacos de pollo" error={errors.title} />
            <FormInput label="Descripción" value={description} onChangeText={setDescription} placeholder="Breve descripción (opcional)" multiline numberOfLines={3} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FormInput label="Tiempo (min) *" value={prepTime} onChangeText={setPrepTime} keyboardType="numeric" placeholder="30" error={errors.prepTime} />
              </View>
              <View style={{ flex: 1 }}>
                <FormInput label="Porciones *" value={servings} onChangeText={setServings} keyboardType="numeric" placeholder="4" error={errors.servings} />
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
                  placeholder="Ingrediente" containerStyle={{ flex: 2 }}
                />
                <FormInput
                  label="" value={ing.quantity} onChangeText={v => updateIngredient(i, 'quantity', v)}
                  placeholder="Cant." keyboardType="numeric" containerStyle={{ flex: 1 }}
                />
                <FormInput
                  label="" value={ing.unit} onChangeText={v => updateIngredient(i, 'unit', v)}
                  placeholder="Unidad" containerStyle={{ flex: 1 }}
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
});
