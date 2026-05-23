import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/FormInput';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'El correo es requerido.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Correo inválido.';
    if (!password) e.password = 'La contraseña es requerida.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.error) Alert.alert('Error', result.error);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.emoji}>🍳</Text>
          <Text style={styles.title}>Recetario</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

          <View style={styles.card}>
            <FormInput
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <FormInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              error={errors.password}
            />
            <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Entrando...' : 'Iniciar sesión'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>¿No tienes cuenta? <Text style={styles.linkAccent}>Regístrate</Text></Text>
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
  btn: { backgroundColor: '#E8735A', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: '#9CA3AF', textAlign: 'center', fontSize: 14 },
  linkAccent: { color: '#E8735A', fontWeight: '700' },
});
