import { indexCodebase } from './operations/index-codebase.js';
import { queryDocs } from './operations/query-docs.js';
import { writeFile } from './operations/write-file.js';
import { checkStaleness } from './operations/check-staleness.js';
import { runRalphLoop } from './operations/run-ralph-loop.js';
import { moveSpec } from './operations/move-spec.js';
import { appendChangelog } from './operations/append-changelog.js';
import { readSpec } from './operations/read-spec.js';
import { analyzeChanges } from './operations/analyze-changes.js';
import { generateAdr } from './operations/generate-adr.js';
import { completeSpec } from './operations/complete-spec.js';
import { listInbox } from './operations/list-inbox.js';
import { implementFeature } from './operations/implement-feature.js';

const toolHandlers: Record<string, (args: Record<string, unknown>, workspacePath: string) => Promise<unknown>> = {
  index_codebase: indexCodebase,
  query_docs: queryDocs,
  write_file: writeFile,
  check_staleness: checkStaleness,
  run_ralph_loop: runRalphLoop,
  move_spec: moveSpec,
  append_changelog: appendChangelog,
  read_spec: readSpec,
  analyze_changes: analyzeChanges,
  generate_adr: generateAdr,
  complete_spec: completeSpec,
  list_inbox: listInbox,
  implement_feature: implementFeature,
};

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  workspacePath: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const handler = toolHandlers[name];
    if (!handler) throw new Error(`Unknown tool: ${name}`);

    const result = await handler(args, workspacePath);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, null, 2),
      }],
    };
  }
}
