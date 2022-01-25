export type ProviderType = 'ens'

export class ProviderClient {
    async resolveDid(
        address: string,
        textRecordFields?: string[]
    ): Promise<{ data: any | null; error: any | null }> {
        throw 'resolveDid must be implemented by parent class'
    }

    async domainForAddress(address: string): Promise<{ domain: string | null; error: any | null }> {
        throw '_domainForAddress must be implemented by parent class'
    }
}
