
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { UserPlus, ArrowLeft, User, Phone, FileText, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

export default function SignUp() {
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSignUp() {
        if (!name || !cpf || !email || !password) {
            Alert.alert('Atenção', 'Preencha os campos obrigatórios (Nome, CPF, Email, Senha)');
            return;
        }

        setLoading(true);

        try {
            // 1. Criar usuário no Auth (Passando metadados para o trigger do banco)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nome: name,
                        cpf: cpf,
                        telefone: phone
                    }
                }
            });

            if (authError) throw authError;

            if (authData?.user) {
                // NOTA: No Supabase deste projeto, existe um TRIGGER chamado 'on_auth_user_created'
                // que automaticamente cria os registros nas tabelas 'Usuario' e 'Frentista'
                // usando os dados passados em 'raw_user_meta_data'.

                Alert.alert('Sucesso', 'Conta criada com sucesso!', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            // Se o trigger falhar, o Supabase Auth retorna "Database error saving new user"
            Alert.alert('Erro', error.message || 'Ocorreu um erro ao criar a conta');
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 bg-primary-700"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
            >
                {/* Header */}
                <View className="px-6 pt-12 pb-8">
                    <TouchableOpacity onPress={() => router.back()} className="mb-4">
                        <ArrowLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text className="text-white text-3xl font-bold tracking-tight">Criar Conta</Text>
                    <Text className="text-primary-200 text-base mt-2">Cadastre-se para acessar o sistema</Text>
                </View>

                {/* Formulário */}
                <View className="flex-1 bg-white rounded-t-[40px] px-8 pt-6 pb-80">

                    {/* Logo */}
                    <View className="items-center mb-6">
                        <Image
                            source={require('../assets/logo.png')}
                            className="w-32 h-32"
                            resizeMode="contain"
                        />
                    </View>

                    {/* Nome Completo */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">Nome Completo *</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4">
                            <User size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-4 px-3 text-base text-gray-800"
                                placeholder="Seu nome completo"
                                placeholderTextColor="#9ca3af"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    {/* CPF */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">CPF *</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4">
                            <FileText size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-4 px-3 text-base text-gray-800"
                                placeholder="000.000.000-00"
                                placeholderTextColor="#9ca3af"
                                value={cpf}
                                onChangeText={setCpf}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Telefone */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">Telefone</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4">
                            <Phone size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-4 px-3 text-base text-gray-800"
                                placeholder="(00) 00000-0000"
                                placeholderTextColor="#9ca3af"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* E-mail */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">E-mail *</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4">
                            <Mail size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-4 px-3 text-base text-gray-800"
                                placeholder="seu@email.com"
                                placeholderTextColor="#9ca3af"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    {/* Senha */}
                    <View className="mb-8">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">Senha *</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4">
                            <Lock size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-4 px-3 text-base text-gray-800"
                                placeholder="••••••••"
                                placeholderTextColor="#9ca3af"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Botão Cadastrar */}
                    <TouchableOpacity
                        className={`w-full py-4 rounded-2xl items-center flex-row justify-center gap-3 ${loading ? 'bg-primary-400' : 'bg-primary-700'}`}
                        onPress={handleSignUp}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <UserPlus size={22} color="#FFF" />
                                <Text className="text-white font-bold text-lg">Criar Conta</Text>
                            </>
                        )}
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
