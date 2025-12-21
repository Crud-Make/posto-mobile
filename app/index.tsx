import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { Fuel, Eye, EyeOff, LogIn } from 'lucide-react-native';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    async function checkSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace('/(tabs)/registro');
            }
        } catch (e) {
            console.error('Erro ao verificar sessão:', e);
        } finally {
            setCheckingSession(false);
        }
    }

    async function signInWithEmail() {
        if (!email || !password) {
            Alert.alert('Atenção', 'Preencha todos os campos');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            Alert.alert('Erro', error.message);
        } else {
            router.replace('/(tabs)/registro');
        }
        setLoading(false);
    }

    if (checkingSession) {
        return (
            <View className="flex-1 bg-primary-700 items-center justify-center">
                <ActivityIndicator size="large" color="#FFF" />
                <Text className="text-white mt-4 font-medium">Verificando acesso...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 bg-primary-700"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header com Logo */}
                <View className="items-center pt-16 pb-8">
                    <View className="w-28 h-28 bg-white rounded-full items-center justify-center shadow-2xl mb-6 overflow-hidden">
                        <Image
                            source={require('../assets/logo.png')}
                            className="w-24 h-24"
                            resizeMode="contain"
                        />
                    </View>
                    <Text className="text-white text-3xl font-bold tracking-tight">Posto Providência</Text>
                    <Text className="text-primary-200 text-base mt-2">App do Frentista</Text>
                </View>

                {/* Card de Login */}
                <View className="flex-1 bg-white rounded-t-[40px] px-8 pt-10 pb-12">
                    <Text className="text-2xl font-bold text-gray-800 mb-2">Entrar</Text>
                    <Text className="text-gray-500 mb-8">Acesse sua conta para registrar o turno</Text>

                    {/* Campo E-mail */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">E-mail</Text>
                        <TextInput
                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-4 text-base text-gray-800"
                            placeholder="seu@email.com"
                            placeholderTextColor="#9ca3af"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                        />
                    </View>

                    {/* Campo Senha */}
                    <View className="mb-8">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">Senha</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl">
                            <TextInput
                                className="flex-1 px-5 py-4 text-base text-gray-800"
                                placeholder="••••••••"
                                placeholderTextColor="#9ca3af"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                            />
                            <TouchableOpacity
                                className="px-4"
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff size={24} color="#6b7280" />
                                ) : (
                                    <Eye size={24} color="#6b7280" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Manter Conectado */}
                    <TouchableOpacity
                        className="flex-row items-center mb-8 ml-1"
                        onPress={() => setRememberMe(!rememberMe)}
                        activeOpacity={0.7}
                    >
                        <View className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 ${rememberMe ? 'bg-primary-700 border-primary-700' : 'border-gray-300'}`}>
                            {rememberMe && <View className="w-2 h-2 bg-white rounded-full" />}
                        </View>
                        <Text className="text-gray-600 font-medium">Manter conectado</Text>
                    </TouchableOpacity>

                    {/* Botão Entrar */}
                    <TouchableOpacity
                        className={`w-full py-4 rounded-2xl items-center flex-row justify-center gap-3 ${loading ? 'bg-primary-400' : 'bg-primary-700'}`}
                        onPress={signInWithEmail}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <LogIn size={22} color="#FFF" />
                                <Text className="text-white font-bold text-lg">Entrar</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Link de ajuda */}
                    <TouchableOpacity className="mt-6 items-center">
                        <Text className="text-primary-600 font-medium">Esqueceu a senha?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="mt-6 items-center flex-row justify-center gap-1"
                        onPress={() => router.push('/cadastrar')}
                    >
                        <Text className="text-gray-500">Não tem uma conta?</Text>
                        <Text className="text-primary-700 font-bold">Cadastre-se</Text>
                    </TouchableOpacity>

                    {/* Versão */}
                    <Text className="text-center text-gray-400 text-xs mt-8">
                        Versão 1.0.0 • Posto Providência
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
