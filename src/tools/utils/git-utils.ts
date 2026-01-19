import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function gitDiffNameStatus(cwd: string, ref: string) {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--name-status', ref], { cwd, timeout: 5000 });
    return stdout.trim();
  } catch {
    return '';
  }
}

export async function gitDiffNameOnly(cwd: string) {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--name-only', 'HEAD~1'], { cwd, timeout: 5000 });
    if (stdout.trim()) return stdout.trim();
  } catch {
    // ignore
  }

  try {
    const { stdout } = await execFileAsync('git', ['diff', '--name-only', '--cached'], { cwd, timeout: 5000 });
    return stdout.trim();
  } catch {
    return '';
  }
}
