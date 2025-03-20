/**
 * This source code is licensed under the MIT license.
 * Original source: https://github.com/Kakulukian/youtube-transcript
 *
 * Modified from the original code
 */

import { requestUrl } from 'obsidian'

const RE_YOUTUBE =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)'
const RE_XML_TRANSCRIPT = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g

export function isYoutubeUrl(url: string) {
  return RE_YOUTUBE.test(url)
}

export class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(`[YoutubeTranscript] 🚨 ${message}`)
  }
}

export class YoutubeTranscriptTooManyRequestError extends YoutubeTranscriptError {
  constructor() {
    super(
      'YouTube is receiving too many requests from this IP and now requires solving a captcha to continue',
    )
  }
}

export class YoutubeTranscriptVideoUnavailableError extends YoutubeTranscriptError {
  constructor(videoId: string) {
    super(`The video is no longer available (${videoId})`)
  }
}

export class YoutubeTranscriptDisabledError extends YoutubeTranscriptError {
  constructor(videoId: string) {
    super(`Transcript is disabled on this video (${videoId})`)
  }
}

export class YoutubeTranscriptNotAvailableError extends YoutubeTranscriptError {
  constructor(videoId: string) {
    super(`No transcripts are available for this video (${videoId})`)
  }
}

export class YoutubeTranscriptNotAvailableLanguageError extends YoutubeTranscriptError {
  constructor(lang: string, availableLangs: string[], videoId: string) {
    super(
      `No transcripts are available in ${lang} this video (${videoId}). Available languages: ${availableLangs.join(
        ', ',
      )}`,
    )
  }
}

export type TranscriptConfig = {
  lang?: string
}
export type Transcript = {
  text: string
  duration: number
  offset: number
  lang?: string
}

export type TranscriptAndMetadataResponse = {
  title: string
  transcript: Transcript[]
}

/**
 * Class to retrieve transcript if exist
 */
export class YoutubeTranscript {
  /**
   * Fetch transcript from YTB Video
   * @param videoId Video url or video identifier
   * @param config Get transcript in a specific language ISO
   */
  public static async fetchTranscriptAndMetadata(
    videoId: string,
    config?: TranscriptConfig,
  ): Promise<TranscriptAndMetadataResponse> {
    const identifier = this.retrieveVideoId(videoId)
    const videoPageResponse = await requestUrl({
      url: `https://www.youtube.com/watch?v=${identifier}`,
      headers: {
        ...(config?.lang && { 'Accept-Language': config.lang }),
        'User-Agent': USER_AGENT,
      },
    })
    const videoPageBody = videoPageResponse.text

    // Extract title using regex from <title> tags
    const titleMatch = videoPageBody.match(/<title>(.*?)<\/title>/)
    const title = titleMatch
      ? titleMatch[1].replace(' - YouTube', '').trim()
      : ''

    const splittedHTML = videoPageBody.split('"captions":')

    if (splittedHTML.length <= 1) {
      if (videoPageBody.includes('class="g-recaptcha"')) {
        throw new YoutubeTranscriptTooManyRequestError()
      }
      if (!videoPageBody.includes('"playabilityStatus":')) {
        throw new YoutubeTranscriptVideoUnavailableError(videoId)
      }
      throw new YoutubeTranscriptDisabledError(videoId)
    }

    const captions = (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(
          splittedHTML[1].split(',"videoDetails')[0].replace('\n', ''),
        )
      } catch (e) {
        return undefined
      }
    })()?.playerCaptionsTracklistRenderer

    if (!captions) {
      throw new YoutubeTranscriptDisabledError(videoId)
    }

    if (!('captionTracks' in captions)) {
      throw new YoutubeTranscriptNotAvailableError(videoId)
    }

    if (
      config?.lang &&
      !captions.captionTracks.some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (track: any) => track.languageCode === config?.lang,
      )
    ) {
      throw new YoutubeTranscriptNotAvailableLanguageError(
        config?.lang,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        captions.captionTracks.map((track: any) => track.languageCode),
        videoId,
      )
    }

    const transcriptURL: string = (
      config?.lang
        ? captions.captionTracks.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (track: any) => track.languageCode === config?.lang,
          )
        : captions.captionTracks[0]
    ).baseUrl

    const transcriptResponse = await requestUrl({
      url: transcriptURL,
      headers: {
        ...(config?.lang && { 'Accept-Language': config.lang }),
        'User-Agent': USER_AGENT,
      },
    })
    if (transcriptResponse.status !== 200) {
      throw new YoutubeTranscriptNotAvailableError(videoId)
    }
    const transcriptBody = transcriptResponse.text
    const results = [...transcriptBody.matchAll(RE_XML_TRANSCRIPT)]
    return {
      title,
      transcript: results.map((result) => ({
        text: result[3],
        duration: parseFloat(result[2]),
        offset: parseFloat(result[1]),
        lang: config?.lang ?? captions.captionTracks[0].languageCode,
      })),
    }
  }

  /**
   * Retrieve video id from url or string
   * @param videoId video url or video id
   */
  private static retrieveVideoId(videoId: string) {
    if (videoId.length === 11) {
      return videoId
    }
    const matchId = videoId.match(RE_YOUTUBE)
    if (matchId?.length) {
      return matchId[1]
    }
    throw new YoutubeTranscriptError('Impossible to retrieve Youtube video ID.')
  }
}
