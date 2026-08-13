import { presetChecklist } from '../data/checklistData'
import type { GroupReviewRecord, M01Progress } from '../types'

export const STORAGE_KEY = 'qijing-training-demo:m01:v1'

export function createInitialGroupReview(): GroupReviewRecord {
  return {
    targetUserId: '',
    correctionAnnotationId: '',
    evidenceAccurate: '',
    correctionReasonable: '',
    omissions: '',
    suggestion: '',
    submitted: false,
  }
}

export function createInitialProgress(): M01Progress {
  return {
    version: 1,
    route: 'day1',
    askedAnswerIds: [],
    annotations: [],
    corrections: {},
    groupReview: createInitialGroupReview(),
    checklist: presetChecklist.map((item) => ({ ...item })),
    updatedAt: new Date().toISOString(),
  }
}

export function loadProgress(): M01Progress {
  if (typeof window === 'undefined') return createInitialProgress()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialProgress()
    const parsed = JSON.parse(raw) as M01Progress
    if (parsed.version !== 1) return createInitialProgress()
    return parsed
  } catch {
    return createInitialProgress()
  }
}

export function saveProgress(progress: M01Progress): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }))
}

export function clearProgress(): M01Progress {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
  return createInitialProgress()
}
