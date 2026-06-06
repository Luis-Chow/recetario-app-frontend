import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/FormInput';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Register'> };

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es requerido.';
    if (!email.trim()) e.email = 'El correo es requerido.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Correo inválido.';
    if (!password) e.password = 'La contraseña es requerida.';
    else if (/\s/.test(password)) e.password = 'La contraseña no puede contener espacios.';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres.';
    if (password !== confirm) e.confirm = 'Las contraseñas no coinciden.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    setGeneralError('');
    if (!validate()) return;
    setLoading(true);
    const result = await register(name.trim(), email.trim(), password);
    setLoading(false);
    if (result.error) {
      setGeneralError(result.error);
      Alert.alert('Error', result.error);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.emoji}>🍳</Text>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Únete al recetario</Text>

          <View style={styles.card}>
            <FormInput label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" maxLength={50} error={errors.name} />
            <FormInput
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
              error={errors.email}
            />
            <FormInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres, sin espacios"
              secureTextEntry
              autoCapitalize="none"
              maxLength={64}
              error={errors.password}
            />
            <FormInput
              label="Confirmar contraseña"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repite la contraseña"
              secureTextEntry
              autoCapitalize="none"
              maxLength={64}
              error={errors.confirm}
            />
            {generalError ? (
              <View style={styles.alertBox}>
                <Text style={styles.alertText}>⚠️ {generalError}</Text>
              </View>
            ) : null}
            <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Creando...' : 'Crear cuenta'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>¿Ya tienes cuenta? <Text style={styles.linkAccent}>Inicia sesión</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  emoji: { textAlign: 'center', fontSize: 56, marginBottom: 8 },
  title: { color: '#F9FAFB', fontSize: 32, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#9CA3AF', fontSize: 15, textAlign: 'center', marginBottom: 32, marginTop: 4 },
  card: { backgroundColor: '#1F2937', borderRadius: 16, padding: 20, marginBottom: 24 },
  alertBox: { backgroundColor: '#4B2020', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#7F1D1D' },
  alertText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  btn: { backgroundColor: '#E8735A', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: '#9CA3AF', textAlign: 'center', fontSize: 14 },
  linkAccent: { color: '#E8735A', fontWeight: '700' },
});
