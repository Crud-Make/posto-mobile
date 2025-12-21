import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configuração do comportamento das notificações
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export interface PushNotificationState {
    expoPushToken: string | null;
    notification: Notifications.Notification | null;
}

/**
 * Registra o dispositivo para receber push notifications
 * Retorna o Expo Push Token ou null se falhar
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    // Push notifications só funcionam em dispositivos físicos
    if (!Device.isDevice) {
        console.log('Push notifications não funcionam em emuladores');
        return null;
    }

    // Verificar/solicitar permissão
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Permissão de notificação não concedida');
        return null;
    }

    try {
        // Obter o Expo Push Token
        const pushTokenResponse = await Notifications.getExpoPushTokenAsync({
            projectId: 'posto-frentista', // Deve coincidir com o slug do app.json
        });
        token = pushTokenResponse.data;
        console.log('Expo Push Token:', token);
    } catch (error) {
        console.error('Erro ao obter push token:', error);
        return null;
    }

    // Configuração específica para Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Notificações',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#b91c1c',
        });
    }

    return token;
}

/**
 * Salva o push token no Supabase vinculado ao usuário/frentista
 */
export async function savePushToken(expoPushToken: string): Promise<boolean> {
    try {
        // Buscar usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('Usuário não autenticado');
            return false;
        }

        // Buscar ID do usuário na tabela Usuario
        const { data: usuario, error: userError } = await supabase
            .from('Usuario')
            .select('id')
            .eq('email', user.email)
            .single();

        if (userError || !usuario) {
            console.error('Usuário não encontrado na tabela Usuario');
            return false;
        }

        // Buscar frentista associado (se existir)
        const { data: frentista } = await supabase
            .from('Frentista')
            .select('id')
            .eq('supabase_user_id', user.id)
            .single();

        // Verificar se o token já existe
        const { data: existingToken } = await supabase
            .from('PushToken')
            .select('id')
            .eq('usuario_id', usuario.id)
            .eq('expo_push_token', expoPushToken)
            .single();

        if (existingToken) {
            // Atualizar token existente (ativar e atualizar timestamp)
            await supabase
                .from('PushToken')
                .update({
                    ativo: true,
                    device_info: `${Device.brand} ${Device.modelName} - ${Platform.OS} ${Platform.Version}`,
                })
                .eq('id', existingToken.id);
        } else {
            // Inserir novo token
            await supabase
                .from('PushToken')
                .insert({
                    usuario_id: usuario.id,
                    frentista_id: frentista?.id || null,
                    expo_push_token: expoPushToken,
                    device_info: `${Device.brand} ${Device.modelName} - ${Platform.OS} ${Platform.Version}`,
                    ativo: true,
                });
        }

        console.log('Push token salvo com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao salvar push token:', error);
        return false;
    }
}

/**
 * Remove o push token do Supabase (logout)
 */
export async function removePushToken(expoPushToken: string): Promise<void> {
    try {
        await supabase
            .from('PushToken')
            .update({ ativo: false })
            .eq('expo_push_token', expoPushToken);
    } catch (error) {
        console.error('Erro ao remover push token:', error);
    }
}

/**
 * Busca notificações não lidas do frentista
 */
export async function getUnreadNotifications(): Promise<any[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: frentista } = await supabase
            .from('Frentista')
            .select('id')
            .eq('supabase_user_id', user.id)
            .single();

        if (!frentista) return [];

        const { data: notifications, error } = await supabase
            .from('Notificacao')
            .select('*')
            .eq('frentista_id', frentista.id)
            .eq('lida', false)
            .order('created_at', { ascending: false });

        return notifications || [];
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        return [];
    }
}

/**
 * Marca uma notificação como lida
 */
export async function markNotificationAsRead(notificationId: number): Promise<void> {
    try {
        await supabase
            .from('Notificacao')
            .update({ lida: true })
            .eq('id', notificationId);
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
    }
}

/**
 * Configura os listeners de notificação
 * Retorna função para cleanup
 */
export function setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
): () => void {
    // Listener para quando a notificação é recebida (app em foreground)
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notificação recebida:', notification);
        onNotificationReceived?.(notification);
    });

    // Listener para quando o usuário interage com a notificação
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Resposta à notificação:', response);
        onNotificationResponse?.(response);
    });

    // Retorna função para remover listeners
    return () => {
        notificationListener.remove();
        responseListener.remove();
    };
}
