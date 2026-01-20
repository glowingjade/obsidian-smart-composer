import { requestUrl } from 'obsidian'

import {
  GEMINI_CODE_ASSIST_ENDPOINT,
  GEMINI_CODE_ASSIST_HEADERS,
} from '../../constants'

type GeminiOAuthState = {
  refreshToken: string
  accessToken?: string
  projectId?: string
  managedProjectId?: string
}

type ProjectContextResult = {
  auth: GeminiOAuthState
  effectiveProjectId: string
}

const projectContextResultCache = new Map<string, ProjectContextResult>()
const projectContextPendingCache = new Map<
  string,
  Promise<ProjectContextResult>
>()

const CODE_ASSIST_METADATA = {
  ideType: 'IDE_UNSPECIFIED',
  platform: 'PLATFORM_UNSPECIFIED',
  pluginType: 'GEMINI',
} as const

type GeminiUserTier = {
  id?: string
  isDefault?: boolean
  userDefinedCloudaicompanionProject?: boolean
}

type LoadCodeAssistPayload = {
  cloudaicompanionProject?: string
  currentTier?: {
    id?: string
  }
  allowedTiers?: GeminiUserTier[]
}

type OnboardUserPayload = {
  done?: boolean
  response?: {
    cloudaicompanionProject?: {
      id?: string
    }
  }
}

class ProjectIdRequiredError extends Error {
  constructor() {
    super(
      'Gemini requires a Google Cloud project. Enable the Gemini for Google Cloud API on a project you control.',
    )
  }
}

function buildMetadata(projectId?: string): Record<string, string> {
  const metadata: Record<string, string> = {
    ideType: CODE_ASSIST_METADATA.ideType,
    platform: CODE_ASSIST_METADATA.platform,
    pluginType: CODE_ASSIST_METADATA.pluginType,
  }
  if (projectId) {
    metadata.duetProject = projectId
  }
  return metadata
}

function getDefaultTierId(allowedTiers?: GeminiUserTier[]): string | undefined {
  if (!allowedTiers || allowedTiers.length === 0) {
    return undefined
  }
  for (const tier of allowedTiers) {
    if (tier?.isDefault) {
      return tier.id
    }
  }
  return allowedTiers[0]?.id
}

function isFreeTier(tierId?: string): boolean {
  if (!tierId) {
    return false
  }
  const normalized = tierId.trim().toUpperCase()
  return normalized === 'FREE' || normalized === 'FREE-TIER'
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getCacheKey(auth: GeminiOAuthState): string | undefined {
  const refresh = auth.refreshToken?.trim()
  return refresh ? refresh : undefined
}

export function invalidateProjectContextCache(refreshToken?: string): void {
  if (!refreshToken) {
    projectContextPendingCache.clear()
    projectContextResultCache.clear()
    return
  }
  projectContextPendingCache.delete(refreshToken)
  projectContextResultCache.delete(refreshToken)
}

export async function loadManagedProject(
  accessToken: string,
  projectId?: string,
): Promise<LoadCodeAssistPayload | null> {
  try {
    const metadata = buildMetadata(projectId)
    const requestBody: Record<string, unknown> = { metadata }
    if (projectId) {
      requestBody.cloudaicompanionProject = projectId
    }

    const response = await requestUrl({
      url: `${GEMINI_CODE_ASSIST_ENDPOINT}/v1internal:loadCodeAssist`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...GEMINI_CODE_ASSIST_HEADERS,
      },
      body: JSON.stringify(requestBody),
    })

    if (response.status < 200 || response.status >= 300) {
      return null
    }

    return response.json as LoadCodeAssistPayload
  } catch (error) {
    console.error('Failed to load Gemini managed project:', error)
    return null
  }
}

export async function onboardManagedProject(
  accessToken: string,
  tierId: string,
  projectId?: string,
  attempts = 10,
  delayMs = 5000,
): Promise<string | undefined> {
  const metadata = buildMetadata(projectId)
  const requestBody: Record<string, unknown> = {
    tierId,
    metadata,
  }

  if (!isFreeTier(tierId)) {
    if (!projectId) {
      throw new ProjectIdRequiredError()
    }
    requestBody.cloudaicompanionProject = projectId
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await requestUrl({
        url: `${GEMINI_CODE_ASSIST_ENDPOINT}/v1internal:onboardUser`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...GEMINI_CODE_ASSIST_HEADERS,
        },
        body: JSON.stringify(requestBody),
      })

      if (response.status < 200 || response.status >= 300) {
        return undefined
      }

      const payload = response.json as OnboardUserPayload
      const managedProjectId = payload.response?.cloudaicompanionProject?.id
      if (payload.done && managedProjectId) {
        return managedProjectId
      }
      if (payload.done && projectId) {
        return projectId
      }
    } catch (error) {
      console.error('Failed to onboard Gemini managed project:', error)
      return undefined
    }

    if (attempt < attempts - 1) {
      await wait(delayMs)
    }
  }

  return undefined
}

export async function ensureProjectContext(params: {
  auth: GeminiOAuthState
  onUpdate?: (nextAuth: GeminiOAuthState) => Promise<void>
}): Promise<ProjectContextResult> {
  const { auth, onUpdate } = params
  const accessToken = auth.accessToken
  if (!accessToken) {
    return { auth, effectiveProjectId: '' }
  }

  const cacheKey = getCacheKey(auth)
  if (cacheKey) {
    const cached = projectContextResultCache.get(cacheKey)
    if (cached) {
      return cached
    }
    const pending = projectContextPendingCache.get(cacheKey)
    if (pending) {
      return pending
    }
  }

  const resolveContext = async (): Promise<ProjectContextResult> => {
    const rawProjectId = auth.projectId?.trim()
    const rawManagedProjectId = auth.managedProjectId?.trim()
    const projectId = rawProjectId === '' ? undefined : rawProjectId
    const managedProjectId =
      rawManagedProjectId === '' ? undefined : rawManagedProjectId

    if (projectId || managedProjectId) {
      return {
        auth,
        effectiveProjectId: projectId ?? managedProjectId ?? '',
      }
    }

    const loadPayload = await loadManagedProject(accessToken, projectId)
    if (loadPayload?.cloudaicompanionProject) {
      const updatedAuth: GeminiOAuthState = {
        ...auth,
        managedProjectId: loadPayload.cloudaicompanionProject,
      }
      await onUpdate?.(updatedAuth)
      return {
        auth: updatedAuth,
        effectiveProjectId: loadPayload.cloudaicompanionProject,
      }
    }

    if (!loadPayload) {
      throw new ProjectIdRequiredError()
    }

    const currentTierId = loadPayload.currentTier?.id ?? undefined
    if (currentTierId && !isFreeTier(currentTierId)) {
      throw new ProjectIdRequiredError()
    }

    const defaultTierId = getDefaultTierId(loadPayload.allowedTiers)
    const tierId = defaultTierId ?? 'FREE'

    if (!isFreeTier(tierId)) {
      throw new ProjectIdRequiredError()
    }

    const newManagedProjectId = await onboardManagedProject(
      accessToken,
      tierId,
      projectId,
    )
    if (newManagedProjectId) {
      const updatedAuth: GeminiOAuthState = {
        ...auth,
        managedProjectId: newManagedProjectId,
      }
      await onUpdate?.(updatedAuth)
      return {
        auth: updatedAuth,
        effectiveProjectId: newManagedProjectId,
      }
    }

    throw new ProjectIdRequiredError()
  }

  if (!cacheKey) {
    return resolveContext()
  }

  const promise = resolveContext()
    .then((result) => {
      const nextKey = getCacheKey(result.auth) ?? cacheKey
      projectContextPendingCache.delete(cacheKey)
      projectContextResultCache.set(nextKey, result)
      if (nextKey !== cacheKey) {
        projectContextResultCache.delete(cacheKey)
      }
      return result
    })
    .catch((error) => {
      projectContextPendingCache.delete(cacheKey)
      throw error
    })

  projectContextPendingCache.set(cacheKey, promise)
  return promise
}
