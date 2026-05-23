import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/FormInput';

type RouteParams = { GroupForm: { groupId?: string } };

const COLORS = [
  '#E8735A', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

export default function GroupFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'GroupForm'>>();
  const { groupId } = route.params ?? {};
  const { groups, addGroup, updateGroup } = useData();
  const { user } = useAuth();
  const editing = !!groupId;
  const existing = editing ? groups.find(g => g.id === groupId) : undefined;

  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [color, setColor] = useState(existing?.color || COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es requerido.';
    const duplicate = groups.find(
      g => g.userId === user?.id &&
        g.id !== groupId &&
        g.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) e.name = 'Ya tienes un grupo con ese nombre.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    const data = {
      userId: user!.id,
      name: name.trim(),
      description: description.trim(),
      color,
    };
    if (editing && groupId) {
      await updateGroup(groupId, data);
    } else {
      await addGroup(data);
    }
    setLoading(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.back}>← Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>{editing ? 'Editar Grupo' : 'Nuevo Grupo'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text style={styles.save}>{loading ? '...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <FormInput
              label="Nombre *"
              value={name}
              onChangeText={setName}
              placeholder="Ej. Postres, Desayunos, Vegetarianas..."
              error={errors.name}
            />
            <FormInput
              label="Descripción"
              value={description}
              onChangeText={setDescription}
              placeholder="Breve descripción (opcional)"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎨 Color del grupo</Text>
            <View style={styles.colorsRow}>
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c && styles.colorSelected,
                  ]}
                >
                  {color === c && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Vista previa</Text>
            <View style={styles.previewCard}>
              <View style={[styles.colorTag, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>{name.trim() || 'Nombre del grupo'}</Text>
                {description.trim() ? (
                  <Text style={styles.previewDesc}>{description}</Text>
                ) : null}
              </View>
            </View>
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
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  colorCircle: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'transparent',
  },
  colorSelected: { borderColor: '#F9FAFB' },
  checkmark: { color: '#fff', fontSize: 20, fontWeight: '800' },
  previewSection: { marginTop: 8 },
  previewLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  previewCard: {
    backgroundColor: '#1F2937', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  colorTag: { width: 8, height: 48, borderRadius: 4 },
  previewTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '700' },
  previewDesc: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
});
