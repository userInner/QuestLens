/**
 * File-based action logger for the Agent.
 * Writes agent decisions/actions to a JSON file that the frontend can poll.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface AgentLogEntry {
  id: number;
  timestamp: number;
  type: 'think' | 'tool_call' | 'result' | 'tweet' | 'mood_change' | 'identity';
  content: string;
  mood?: string;
  moodIntensity?: number;
  cycle?: number;
}

const LOG_FILE = join(process.cwd(), '..', 'frontend', 'public', 'agent-log.json');
const MAX_ENTRIES = 100;

let entryId = 0;

export function writeAgentLog(entry: Omit<AgentLogEntry, 'id' | 'timestamp'>): void {
  const entries = readAgentLog();
  
  const newEntry: AgentLogEntry = {
    ...entry,
    id: ++entryId,
    timestamp: Date.now(),
  };

  entries.unshift(newEntry);

  // Keep only last MAX_ENTRIES
  const trimmed = entries.slice(0, MAX_ENTRIES);

  try {
    writeFileSync(LOG_FILE, JSON.stringify(trimmed, null, 2));
  } catch (err) {
    // If directory doesn't exist, try to create
    const dir = join(process.cwd(), '..', 'frontend', 'public');
    try {
      const { mkdirSync } = require('fs');
      mkdirSync(dir, { recursive: true });
      writeFileSync(LOG_FILE, JSON.stringify(trimmed, null, 2));
    } catch {
      console.warn('Failed to write agent log:', err);
    }
  }
}

export function readAgentLog(): AgentLogEntry[] {
  try {
    if (existsSync(LOG_FILE)) {
      const data = readFileSync(LOG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {}
  return [];
}

export function clearAgentLog(): void {
  writeFileSync(LOG_FILE, '[]');
}
