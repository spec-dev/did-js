import { ProviderClient, NetworkType } from './types'
import { ethers } from 'ethers'
import { Resolver } from '@ethersproject/providers'
import { getContractTokenInfoFromENSUrl } from './helpers'
import { tokenUriAbis, tokenUriGetters, getImageUrlFromTokenUri } from './metadata'
import { AVATAR } from './constants'
import { protocols } from './metadata'

const DEFAULT_SETTINGS: { network: NetworkType; infuraId: string | undefined } = {
    network: (process.env.NETWORK || 'mainnet') as NetworkType,
    infuraId: process.env.INFURA_ID,
}

export class EnsProvider extends ProviderClient {
    protected network: NetworkType
    protected infuraId: string

    // Eth node provider.
    provider: ethers.providers.InfuraWebSocketProvider

    constructor(options?: { network?: NetworkType | null; infuraId?: string | null }) {
        super()
        this.network = options?.network || DEFAULT_SETTINGS.network
        this.infuraId = (options?.infuraId || DEFAULT_SETTINGS.infuraId)!
        this.provider = this._initProvider()
    }

    async resolveDid(
        address: string,
        textRecordFields?: string[]
    ): Promise<{
        data: any | null
        error: any | null
    }> {
        console.log('resolving did')

        // Get the registered ENS domain for this address (if one exists).
        const { domain, error: domainError } = await this.domainForAddress(address)
        console.log('domain for address', domain, domainError)
        if (domainError) return { data: null, error: domainError }
        if (!domain) return { data: null, error: null }

        // Create a map of all requested text records.
        const textRecords: { [key: string]: any } = {}
        if (textRecordFields) {
            console.log('getting resolver')
            // Get the resolver contract for this domain.
            const { resolver, error: resolverError } = await this._resolverForDomain(domain)
            console.log('got resolver', resolverError)
            if (resolverError) return { data: null, error: resolverError }
            if (!resolver) return { data: null, error: `Error finding resolver for ${domain}.` }

            try {
                console.log('getting text records', textRecordFields)
                const textRecordValues = await Promise.all(
                    textRecordFields.map((f) => resolver.getText(f) || null)
                )
                console.log('got text records')
                for (let i = 0; i < textRecordFields.length; i++) {
                    textRecords[textRecordFields[i]] = textRecordValues[i]
                }
            } catch (err) {
                return { data: null, error: err }
            }
        }

        // Resolve avatar text record into an HTTP(s) image url.
        if (textRecords[AVATAR]) {
            console.log('resolving avatar')
            try {
                textRecords[AVATAR] = await this._resolveAvatarUrl(textRecords[AVATAR])
            } catch (err) {
                textRecords[AVATAR] = null
            }
        }

        return { data: { domain, textRecords }, error: null }
    }

    async domainForAddress(address: string): Promise<{ domain: string | null; error: any | null }> {
        try {
            const domain = await this.provider.lookupAddress(address)
            return { domain, error: null }
        } catch (error) {
            return { domain: null, error }
        }
    }

    private async _resolverForDomain(
        domain: string
    ): Promise<{ resolver: Resolver | null; error: any | null }> {
        try {
            const resolver = await this.provider.getResolver(domain)
            return { resolver, error: null }
        } catch (error) {
            return { resolver: null, error }
        }
    }

    private _initProvider() {
        return new ethers.providers.InfuraWebSocketProvider(this.network, this.infuraId)
    }

    private async _resolveAvatarUrl(url: string): Promise<string | null> {
        // HTTP(s) url.
        if (url.startsWith(protocols.HTTP) || url.startsWith(protocols.HTTPS)) {
            console.log('http url')
            return url
        }
        // ERC721 url.
        if (url.startsWith(protocols.ERC721)) {
            console.log('erc721 url')
            return await this._getAvatarUrlFromTokenContract(
                url,
                tokenUriAbis.ERC721,
                tokenUriGetters.ERC721
            )
        }
        // ERC1155 url.
        if (url.startsWith(protocols.ERC1155)) {
            console.log('erc1155 url')
            return await this._getAvatarUrlFromTokenContract(
                url,
                tokenUriAbis.ERC1155,
                tokenUriGetters.ERC1155
            )
        }
        return null
    }

    private async _getAvatarUrlFromTokenContract(
        url: string,
        abi: string[],
        getter: string
    ): Promise<string | null> {
        console.log('getContractTokenInfoFromENSUrl')
        // Parse contract address and tokenId from url.
        const contractTokenInfo = getContractTokenInfoFromENSUrl(url)
        if (!contractTokenInfo) return null

        // Create a reference to the contract that owns this NFT.
        const [contractAddress, tokenId] = contractTokenInfo
        const contract = this._createContractRef(contractAddress, abi)
        console.log('creating contract ref')
        if (!contract) return null

        // Get the token URI from the NFT contract for the tokenId.
        console.log('calling contract function', getter)
        const tokenUri = await this._callContractFunc(contract, getter, tokenId)
        console.log('got token uri', tokenUri)
        if (!tokenUri) return null

        console.log('getting image from token uri')

        return await getImageUrlFromTokenUri(tokenUri, tokenId)
    }

    private _createContractRef(address: string, abi: string[]): ethers.Contract | null {
        try {
            return new ethers.Contract(address, abi, this.provider)
        } catch (error) {
            console.error(`Error creating reference to contract ${address}: ${error}.`)
            return null
        }
    }

    private async _callContractFunc(
        contract: ethers.Contract,
        funcName: string,
        ...args: any[]
    ): Promise<any | null> {
        try {
            const func = contract[funcName]
            if (!func) throw `No contract function named ${funcName}`
            return await func(...args)
        } catch (error) {
            console.error(`Error calling function ${funcName}: ${error}.`)
            return null
        }
    }
}
