import { providers } from './lib/providers'
import { ProviderType, ProviderClient } from './lib/types'
import { EnsProvider } from './lib/ens'

const providerClients = new Map<string, ProviderClient>()

const resolveDid = async (
    address: string,
    provider: ProviderType,
    textRecordFields?: string[]
): Promise<{
    data: any | null
    error: any | null
}> => {
    // Upsert provider client for provider.
    let providerClient = providerClients.get(provider)
    if (!providerClient) {
        switch (provider) {
            case providers.ENS:
                providerClient = new EnsProvider({ network: process.env.NETWORK })
                providerClients.set(provider, providerClient)
                break
            default:
                return { data: null, error: 'Unknown DID provider' }
        }
    }

    return await providerClient.resolveDid(address, textRecordFields)
}

export { resolveDid, providers }
