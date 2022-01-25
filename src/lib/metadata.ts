import { get } from './fetch'

export const protocols = {
    HTTP: 'http://',
    HTTPS: 'http://',
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

const formatInfuraIpfsUri = (cid: string, path?: string) =>
    `https://${cid}.ipfs.infura-ipfs.io${path}`

const formatIpfsImageAsHttp = (cid: string): string => `https://ipfs.io/ipfs/${cid}`

export async function getMetadataFromHttpUri(uri: string): Promise<any | null> {
    try {
        return await get(fetch, uri)
    } catch (error) {
        console.error(error)
        return null
    }
}

export function getCidAndPathFromIpfsUri(uri: string): string[] {
    uri = uri.slice(protocols.IPFS.length)

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
}

export async function getImageUrlFromTokenUri(uri: string): Promise<string | null> {
    const metadata = (await getMetadataFromTokenUri(uri)) || {}
    const imageUrl = metadata.image
    if (!imageUrl) return null

    // HTTP(s) image.
    if (imageUrl.startsWith(protocols.HTTP) || imageUrl.startsWith(protocols.HTTPS)) {
        return imageUrl
    }

    // IPFS image.
    if (imageUrl.startsWith(protocols.IPFS)) {
        const [cid, _] = getCidAndPathFromIpfsUri(imageUrl)
        return formatIpfsImageAsHttp(cid)
    }

    return null
}
