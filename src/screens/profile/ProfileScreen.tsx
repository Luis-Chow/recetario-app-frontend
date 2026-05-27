import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/FormInput';

export default function ProfileScreen() {
  const { user, logout, updateProfile, deleteAccount } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es requerido.';
    if (!email.trim()) e.email = 'El correo es requerido.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Correo inválido.';
    if (password && /\s/.test(password)) e.password = 'La contraseña no puede contener espacios.';
    else if (password && password.length < 6) e.password = 'Mínimo 6 caracteres.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    const updates: Parameters<typeof updateProfile>[0] = { name: name.trim(), email: email.trim() };
    if (password) updates.password = password;
    const result = await updateProfile(updates);
    setLoading(false);
    if (result?.error) {
      Alert.alert('Error', result.error);
    } else {
      setPassword('');
      setEditing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro? Esta acción no se puede deshacer y perderás todos tus datos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteAccount() },
      ]
    );
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPassword('');
    setErrors({});
    setEditing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.title}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <View style={styles.card}>
            {editing ? (
              <>
                <FormInput label="Nombre" value={name} onChangeText={setName} maxLength={50} error={errors.name} />
                <FormInput
                  label="Correo" value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" maxLength={100} error={errors.email}
                />
                <FormInput
                  label="Nueva contraseña (opcional)" value={password} onChangeText={setPassword}
                  placeholder="Dejar vacío para no cambiar" secureTextEntry
                  autoCapitalize="none" maxLength={64} error={errors.password}
                />
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleCancel}>
                    <Text style={styles.btnSecondaryText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSave} disabled={loading}>
                    <Text style={styles.btnText}>{loading ? 'Guardando...' : 'Guardar'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => setEditing(true)}>
                <Text style={styles.btnText}>✏️  Editar perfil</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#374151' }]} onPress={logout}>
              <Text style={[styles.btnText, { color: '#D1D5DB' }]}>Cerrar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDanger, { marginTop: 12 }]} onPress={handleDelete}>
              <Text style={styles.btnText}>🗑️  Eliminar cuenta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  container: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24, paddingTop: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8735A', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: '800' },
  email: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  card: { backgroundColor: '#1F2937', borderRadius: 16, padding: 20, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#E8735A' },
  btnSecondary: { backgroundColor: '#374151' },
  btnDanger: { backgroundColor: '#DC2626' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondaryText: { color: '#D1D5DB', fontSize: 15, fontWeight: '700' },
});
