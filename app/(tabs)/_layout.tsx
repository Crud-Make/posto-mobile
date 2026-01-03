import { Tabs, router } from 'expo-router';
import { ClipboardList, History, User, Home, ShoppingBag, AlertTriangle } from 'lucide-react-native';
import { View, Platform, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { frentistaService, usuarioService, turnoService } from '../../lib/api';

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const [checking, setChecking] = useState(true);
    const [accountBlocked, setAccountBlocked] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkFrentistaStatus();
    }, []);

    async function checkFrentistaStatus() {
        try {
            // Timeout de segurança de 5 segundos
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout verificando status')), 5000)
            );

            const checkPromise = (async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.replace('/');
                    return;
                }

                // Check if user is admin (admins can access without frentista record)
                const userProfile = await usuarioService.getByEmail(user.email!);
                if (userProfile?.role === 'ADMIN') {
                    setIsAdmin(true);
                    return;
                }

                // Check if frentista exists and is active
                let frentista = await frentistaService.getByUserId(user.id);

                // Self-healing: Se não existir frentista mas o usuário está logado, criar automaticamente
                if (!frentista && user.email) {
                    console.log('Frentista não encontrado, tentando auto-criação para:', user.email);
                    const metadata = user.user_metadata;
                    const { data: newFrentista, error: createError } = await supabase
                        .from('Frentista')
                        .insert({
                            nome: metadata.nome || user.email.split('@')[0],
                            cpf: metadata.cpf || null,
                            telefone: metadata.telefone || null,
                            posto_id: metadata.posto_id || 1, // Fallback para posto 1 se não houver no metadado
                            user_id: user.id,
                            ativo: true,
                            data_admissao: new Date().toISOString().split('T')[0]
                        })
                        .select()
                        .single();

                    if (!createError && newFrentista) {
                        frentista = newFrentista;
                    }
                }

                if (!frentista) {
                    setAccountBlocked(true);
                    return;
                }

                // Verificar se tem caixa aberto hoje
                const { data: statusCaixa, error: rpcError } = await supabase.rpc('verificar_caixa_aberto', {
                    p_frentista_id: frentista.id
                });

                if (!rpcError && statusCaixa && !statusCaixa.aberto) {
                    // Tentativa de abertura automática para agilizar a entrada
                    const turnoAuto = await turnoService.getCurrentTurno(frentista.posto_id);
                    if (turnoAuto) {
                        const { error: openError } = await supabase.rpc('abrir_caixa', {
                            p_turno_id: turnoAuto.id,
                            p_posto_id: frentista.posto_id,
                            p_frentista_id: frentista.id
                        });

                        if (!openError) {
                            setChecking(false);
                            return;
                        }
                    }

                    // Se falhar a abertura automática, cai na tela manual
                    router.replace('/abertura-caixa');
                    return;
                }
            })();

            await Promise.race([checkPromise, timeoutPromise]);
        } catch (error) {
            console.error('Error checking frentista status:', error);
            setChecking(false);
        } finally {
            setChecking(false);
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace('/');
    }

    // Show loading while checking
    if (checking) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#b91c1c" />
                <Text className="text-gray-500 mt-4">Verificando conta...</Text>
            </View>
        );
    }

    // Show blocked screen if frentista is inactive/deleted
    if (accountBlocked) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center px-8">
                <View className="bg-red-100 p-6 rounded-full mb-6">
                    <AlertTriangle size={64} color="#dc2626" />
                </View>
                <Text className="text-2xl font-bold text-gray-800 text-center mb-3">
                    Conta Desativada
                </Text>
                <Text className="text-gray-500 text-center text-base mb-8 leading-6">
                    Seu cadastro de frentista foi desativado ou removido. Entre em contato com o administrador do posto para mais informações.
                </Text>
                <TouchableOpacity
                    onPress={handleLogout}
                    className="bg-red-600 px-8 py-4 rounded-xl"
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-bold text-base">Sair da Conta</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Calcula o padding inferior considerando a safe area do dispositivo
    // Mínimo de 10px, máximo baseado nos insets do dispositivo
    const bottomPadding = Math.max(10, insets.bottom + 5);

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#b91c1c',
                tabBarInactiveTintColor: '#9ca3af',
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#b91c1c',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#f3f4f6',
                    paddingTop: 10,
                    // Usa o padding dinâmico baseado na Safe Area do dispositivo
                    paddingBottom: bottomPadding,
                    // Altura mínima + padding inferior para dispositivos com botões virtuais
                    minHeight: 65 + insets.bottom,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="registro"
                options={{
                    title: 'Registro de Turno',
                    tabBarLabel: 'Registro',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={`p-2 rounded-xl ${focused ? 'bg-primary-50' : ''}`}>
                            <ClipboardList size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="vendas"
                options={{
                    title: 'Venda de Produtos',
                    tabBarLabel: 'Vendas',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={`p-2 rounded-xl ${focused ? 'bg-primary-50' : ''}`}>
                            <ShoppingBag size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="historico"
                options={{
                    title: 'Histórico',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={`p-2 rounded-xl ${focused ? 'bg-primary-50' : ''}`}>
                            <History size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="perfil"
                options={{
                    title: 'Meu Perfil',
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={`p-2 rounded-xl ${focused ? 'bg-primary-50' : ''}`}>
                            <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
