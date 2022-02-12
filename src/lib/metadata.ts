import crossFetch from 'cross-fetch'
import { get } from './fetch'

export const protocols = {
    HTTP: 'http://',
    HTTPS: 'https://',
    IPFS: 'ipfs://',
    ERC721: 'eip155:1/erc721:',
    ERC1155: 'eip155:1/erc1155:',
}

export const tokenUriGetters: { [key: string]: string } = {
    ERC721: 'tokenURI',
    ERC1155: 'uri',
}

export const tokenUriAbis: { [key: string]: string[] } = {
    ERC721: [`function ${tokenUriGetters.ERC721}(uint256 tokenId) public view returns (string)`],
    ERC1155: [`function ${tokenUriGetters.ERC1155}(uint256 id) external view returns (string)`],
}

export const formatInfuraIpfsUri = (cid: string, path?: string) =>
    `https://infura-ipfs.io/ipfs/${cid}${path || ''}`

export const formatIpfsImageAsHttp = (cid: string, path?: string): string =>
    `https://ipfs.io/ipfs/${cid}${path || ''}`

export async function getMetadataFromHttpUri(uri: string): Promise<any | null> {
    try {
        return await get(crossFetch, uri)
    } catch (error) {
        console.error(error)
        return null
    }
}

export function getCidAndPathFromIpfsUri(uri: string): string[] {
    uri = uri.slice(protocols.IPFS.length)
    if (uri.startsWith('ipfs/')) {
        uri = uri.slice(5)
    }

    let cid = uri
    let path = ''
    const indexOfSlash = uri.indexOf('/')
    if (indexOfSlash !== -1) {
        cid = uri.slice(0, indexOfSlash)
        path = uri.slice(indexOfSlash)
    }

    return [cid, path]
}

export async function getMetadataFromIpfsUri(uri: string): Promise<any | null> {
    const [cid, path] = getCidAndPathFromIpfsUri(uri)
    return await getMetadataFromHttpUri(formatInfuraIpfsUri(cid, path))
}

export async function getMetadataFromTokenUri(uri: string): Promise<any | null> {
    // HTTP(s) metadata.
    if (uri.startsWith(protocols.HTTP) || uri.startsWith(protocols.HTTPS)) {
        return await getMetadataFromHttpUri(uri)
    }
    // IPFS metadata.
    if (uri.startsWith(protocols.IPFS)) {
        return await getMetadataFromIpfsUri(uri)
    }
    return null
}

export function maybeFormatUriWithTokenId(uri: string, tokenId: string): string {
    if (uri.includes('0x{id}')) {
        return uri.replace('0x{id}', tokenId)
    }
    if (uri.includes('{id}')) {
        return uri.replace('{id}', tokenId)
    }
    return uri
}

export async function getImageUrlFromTokenUri(
    uri: string,
    tokenId: string
): Promise<string | null> {
    console.log('getImageUrlFromTokenUri', uri, tokenId)
    const resolvedUri = maybeFormatUriWithTokenId(uri, tokenId)
    console.log('got resolved uri', resolvedUri)
    const metadata = (await getMetadataFromTokenUri(resolvedUri)) || {}
    const imageUrl = metadata.image
    console.log('got metadata imageUrl', imageUrl)
    if (!imageUrl) return null

    // HTTP(s) image.
    if (imageUrl.startsWith(protocols.HTTP) || imageUrl.startsWith(protocols.HTTPS)) {
        return imageUrl
    }

    // IPFS image.
    if (imageUrl.startsWith(protocols.IPFS)) {
        const [cid, path] = getCidAndPathFromIpfsUri(imageUrl)
        return formatIpfsImageAsHttp(cid, path)
    }

    return null
}
