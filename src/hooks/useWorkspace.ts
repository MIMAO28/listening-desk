import { useState } from 'react'
import type { Workspace } from '../types.ts'
import { initialWorkspace } from '../lib/workspace.ts'

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace)
  return { workspace, setWorkspace }
}
