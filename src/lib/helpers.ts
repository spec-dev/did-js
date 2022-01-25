// helpers.ts
export function stripTrailingSlash(url: string): string {
    return url.replace(/\/$/, '')
}

export function getContractTokenInfoFromENSUrl(url: string): string[] | null {
    const splitUrl = url.split(':')
    if (splitUrl.length !== 3) return null

    const contractToken = splitUrl[2].split('/')
    if (contractToken.length !== 2) return null

    return contractToken
}
