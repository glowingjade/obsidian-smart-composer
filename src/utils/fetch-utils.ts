import { requestUrl } from 'obsidian'

export async function fetchUrlTitle(url: string): Promise<string | null> {
  try {
    const headResponse = await requestUrl({
      url,
      method: 'HEAD',
    })

    const contentType = headResponse.headers['content-type']
    if (!contentType?.includes('text/html')) {
      return null
    }

    const rangeSizes: (number | null)[] = [8192, 16384, 32768, null] // null is the full page
    let title: string | null = null

    for (const range of rangeSizes) {
      const response = await requestUrl({
        url,
        method: 'GET',
        headers: range
          ? {
              Range: `bytes=0-${range}`,
            }
          : undefined,
      })

      const titleMatch = response.text.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleMatch) {
        title = titleMatch[1].trim()
        break
      }
    }

    return title
  } catch (error) {
    console.warn(`Failed to fetch title for ${url}:`, error)
    return null
  }
}
