import * as path from 'path';
import * as fs from 'fs/promises';
import { RunRalphLoopSchema } from '../schemas.js';

export async function runRalphLoop(args: Record<string, unknown>, workspacePath: string) {
  const { maxIterations, dryRun } = RunRalphLoopSchema.parse(args);
  const progressPath = path.join(workspacePath, 'PROGRESS.md');

  let content: string;
  try {
    content = await fs.readFile(progressPath, 'utf-8');
  } catch {
    return {
      success: false,
      message: 'PROGRESS.md not found. Create it with pending tasks first.',
    };
  }

  const taskPattern = /^- \[ \]\s*(?:\[?(P[012])\]?:?\s*)?(.+)$/gm;
  const tasks: Array<{ priority: string; text: string }> = [];
  let match;

  while ((match = taskPattern.exec(content)) !== null) {
    tasks.push({
      priority: match[1] || 'P2',
      text: match[2].trim(),
    });
  }

  tasks.sort((a, b) => a.priority.localeCompare(b.priority));
  const tasksToProcess = tasks.slice(0, maxIterations);

  return {
    success: true,
    dryRun,
    totalPending: tasks.length,
    tasksToProcess: tasksToProcess.length,
    tasks: tasksToProcess,
    message: dryRun
      ? `Would process ${tasksToProcess.length} tasks`
      : `Found ${tasksToProcess.length} tasks to process`,
  };
}
