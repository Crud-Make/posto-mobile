/**
 * useUpdateChecker - Hook para gerenciar atualizações OTA do EAS Update
 * 
 * FUNCIONALIDADES:
 * 1. Verifica automaticamente por atualizações ao abrir o app
 * 2. Baixa atualizações em background
 * 3. Aplica atualizações críticas instantaneamente (Instant Reload)
 * 4. Suporta Cross-native Runtime Deployments
 * 
 * @version 1.4.0
 * @author Posto Providência
 */

import { useEffect, useState, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { Alert, AppState, AppStateStatus } from 'react-native';

/**
 * Tipos de atualização disponíveis
 */
export type UpdateStatus =
    | 'checking'      // Verificando atualizações
    | 'available'     // Atualização disponível
    | 'downloading'   // Baixando atualização
    | 'ready'         // Pronta para aplicar
    | 'up-to-date'    // Já está na versão mais recente
    | 'error';        // Erro ao verificar/baixar

export interface UpdateInfo {
    status: UpdateStatus;
    isUpdateAvailable: boolean;
    isDownloading: boolean;
    downloadProgress: number;
    error: string | null;
    currentVersion: string;
    /** Se true, aplica a atualização automaticamente sem perguntar */
    autoReload: boolean;
}

/**
 * Hook principal para gerenciamento de atualizações OTA
 * 
 * @param options Configurações do hook
 * @param options.checkOnMount Se deve verificar atualizações ao montar (default: true)
 * @param options.checkOnForeground Se deve verificar quando o app volta ao foreground (default: true)
 * @param options.autoDownload Se deve baixar automaticamente quando disponível (default: true)
 * @param options.criticalUpdate Se true, aplica instantaneamente sem perguntar (default: false)
 */
export function useUpdateChecker(options?: {
    checkOnMount?: boolean;
    checkOnForeground?: boolean;
    autoDownload?: boolean;
    criticalUpdate?: boolean;
}) {
    const {
        checkOnMount = true,
        checkOnForeground = true,
        autoDownload = true,
        criticalUpdate = false
    } = options || {};

    const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
        status: 'up-to-date',
        isUpdateAvailable: false,
        isDownloading: false,
        downloadProgress: 0,
        error: null,
        currentVersion: Updates.runtimeVersion || 'unknown',
        autoReload: criticalUpdate
    });

    /**
     * Verifica se há atualizações disponíveis
     * Retorna true se encontrou uma atualização
     */
    const checkForUpdate = useCallback(async (): Promise<boolean> => {
        // Em desenvolvimento, não verifica atualizações
        if (__DEV__) {
            console.log('[OTA] Modo desenvolvimento - verificação de atualizações desabilitada');
            return false;
        }

        try {
            setUpdateInfo(prev => ({ ...prev, status: 'checking', error: null }));

            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                console.log('[OTA] Nova atualização disponível!');
                setUpdateInfo(prev => ({
                    ...prev,
                    status: 'available',
                    isUpdateAvailable: true
                }));

                // Se autoDownload está habilitado, inicia o download automaticamente
                if (autoDownload) {
                    await downloadUpdate();
                }

                return true;
            } else {
                console.log('[OTA] App já está na versão mais recente');
                setUpdateInfo(prev => ({
                    ...prev,
                    status: 'up-to-date',
                    isUpdateAvailable: false
                }));
                return false;
            }
        } catch (error: any) {
            console.error('[OTA] Erro ao verificar atualizações:', error);
            setUpdateInfo(prev => ({
                ...prev,
                status: 'error',
                error: error.message || 'Erro desconhecido'
            }));
            return false;
        }
    }, [autoDownload]);

    /**
     * Baixa a atualização disponível
     */
    const downloadUpdate = useCallback(async (): Promise<boolean> => {
        if (__DEV__) return false;

        try {
            setUpdateInfo(prev => ({
                ...prev,
                status: 'downloading',
                isDownloading: true,
                downloadProgress: 0
            }));

            const result = await Updates.fetchUpdateAsync();

            if (result.isNew) {
                console.log('[OTA] Atualização baixada com sucesso!');
                setUpdateInfo(prev => ({
                    ...prev,
                    status: 'ready',
                    isDownloading: false,
                    downloadProgress: 100
                }));

                // Se é uma atualização crítica, aplica instantaneamente
                if (criticalUpdate) {
                    console.log('[OTA] Atualização crítica - aplicando instantaneamente...');
                    await applyUpdate();
                }

                return true;
            }

            return false;
        } catch (error: any) {
            console.error('[OTA] Erro ao baixar atualização:', error);
            setUpdateInfo(prev => ({
                ...prev,
                status: 'error',
                isDownloading: false,
                error: error.message || 'Erro ao baixar'
            }));
            return false;
        }
    }, [criticalUpdate]);

    /**
     * Aplica a atualização e reinicia o app (Instant Reload)
     */
    const applyUpdate = useCallback(async () => {
        if (__DEV__) {
            console.log('[OTA] Modo desenvolvimento - recarregamento desabilitado');
            return;
        }

        try {
            console.log('[OTA] Aplicando atualização e reiniciando...');
            await Updates.reloadAsync();
        } catch (error: any) {
            console.error('[OTA] Erro ao aplicar atualização:', error);
            setUpdateInfo(prev => ({
                ...prev,
                status: 'error',
                error: error.message || 'Erro ao aplicar'
            }));
        }
    }, []);

    /**
     * Mostra um alerta amigável perguntando se o usuário quer atualizar
     */
    const promptForUpdate = useCallback(() => {
        Alert.alert(
            '🆕 Atualização Disponível',
            'Uma nova versão do app está pronta. Deseja atualizar agora?\n\nO app será reiniciado automaticamente.',
            [
                {
                    text: 'Mais tarde',
                    style: 'cancel',
                    onPress: () => console.log('[OTA] Usuário adiou a atualização')
                },
                {
                    text: 'Atualizar Agora',
                    style: 'default',
                    onPress: async () => {
                        if (updateInfo.status === 'ready') {
                            await applyUpdate();
                        } else {
                            await downloadUpdate();
                            await applyUpdate();
                        }
                    }
                }
            ],
            { cancelable: false }
        );
    }, [updateInfo.status, downloadUpdate, applyUpdate]);

    // Verificar atualizações ao montar o componente
    useEffect(() => {
        if (checkOnMount) {
            checkForUpdate();
        }
    }, [checkOnMount, checkForUpdate]);

    // Verificar atualizações quando o app volta ao foreground
    useEffect(() => {
        if (!checkOnForeground) return;

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                console.log('[OTA] App voltou ao foreground - verificando atualizações...');
                checkForUpdate();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [checkOnForeground, checkForUpdate]);

    return {
        ...updateInfo,
        checkingUpdate: updateInfo.status === 'checking',
        checkForUpdate,
        downloadUpdate,
        applyUpdate,
        promptForUpdate
    };
}

/**
 * Componente wrapper que mostra feedback visual de atualização
 * Pode ser usado no _layout.tsx para feedback global
 */
export function UpdateBanner() {
    const { status, isUpdateAvailable, promptForUpdate, applyUpdate } = useUpdateChecker({
        checkOnMount: true,
        checkOnForeground: true,
        autoDownload: true,
        criticalUpdate: true // Sempre aplica automaticamente após baixar
    });

    // Em produção, quando uma atualização estiver pronta, mostra o prompt
    useEffect(() => {
        if (status === 'ready' && isUpdateAvailable) {
            promptForUpdate();
        }
    }, [status, isUpdateAvailable, promptForUpdate]);

    // O banner não renderiza nada visualmente, apenas gerencia a lógica
    return null;
}
