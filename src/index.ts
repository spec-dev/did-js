import { providers } from './lib/providers'
import { ProviderType, NetworkType, ProviderClient } from './lib/types'
import { dataErrorTimeout } from './lib/helpers'
import { EnsProvider } from './lib/ens'

const providerClients = new Map<string, ProviderClient>()

const DEFAULT_OPTIONS = {
    network: null,
    infuraId: null,
    timeout: 15000,
}

const resolveDid = async (
    address: string,
    provider: ProviderType,
    textRecordFields?: string[],
    options?: {
        network?: NetworkType
        infuraId?: string
        timeout?: number
    }
): Promise<{
    data: any | null
    error: any | null
}> => {
    const settings = { ...DEFAULT_OPTIONS, ...(options || {}) }
    const { network, infuraId, timeout } = settings

    // Upsert provider client for provider.
    let providerClient = providerClients.get(provider)
    if (!providerClient) {
        switch (provider) {
            case providers.ENS:
                providerClient = new EnsProvider({ network, infuraId })
                providerClients.set(provider, providerClient)
                break
            default:
                return { data: null, error: 'Unknown DID provider' }
        }
    }

    try {
        return await Promise.race([
            dataErrorTimeout(timeout),
            providerClient.resolveDid(address, textRecordFields),
        ])
    } catch (error) {
        return { data: null, error }
    }
}

export { resolveDid, providers }
