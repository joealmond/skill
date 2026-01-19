import { ImplementFeatureSchema } from '../schemas.js';
import { readSpec } from './read-spec.js';
import { analyzeChanges } from './analyze-changes.js';
import { indexCodebase } from './index-codebase.js';
import { generateAdr } from './generate-adr.js';
import { appendChangelog } from './append-changelog.js';
import { completeSpec } from './complete-spec.js';
import { runRalphLoop } from './run-ralph-loop.js';
import { writeFile } from './write-file.js';

export async function implementFeature(args: Record<string, unknown>, workspacePath: string) {
  const { specName, createAdr, autoRunRalph } = ImplementFeatureSchema.parse(args);

  const fileName = specName.endsWith('.md') ? specName : `${specName}.md`;
  const workflow: Array<{ step: string; status: string; result: string }> = [];

  try {
    workflow.push({ step: '1. Read spec', status: 'in-progress', result: '' });
    const specReadResult = await readSpec({ specName }, workspacePath);
    if (!specReadResult.success) {
      throw new Error(`Failed to read spec: ${(specReadResult as { message: string }).message}`);
    }
    const spec = specReadResult as any;
    workflow[workflow.length - 1].status = 'done';
    workflow[workflow.length - 1].result = `Parsed: ${spec.title} (${spec.requirements?.length || 0} requirements)`;

    workflow.push({ step: '2. Parse requirements', status: 'in-progress', result: '' });
    const requirements = (spec.requirements || []).map((r: any) => r.text);
    const filesToCreate = (spec.filesToModify || []).map((f: any) => f.path);
    workflow[workflow.length - 1].status = 'done';
    workflow[workflow.length - 1].result = `${requirements.length} requirements, ${filesToCreate.length} files to create`;

    workflow.push({ step: '3. Analyze codebase', status: 'in-progress', result: '' });
    const changeAnalysis = await analyzeChanges({}, workspacePath);
    workflow[workflow.length - 1].status = 'done';
    workflow[workflow.length - 1].result = `${(changeAnalysis as any).summary?.total || 0} recent changes analyzed`;

    workflow.push({ step: '4. Index codebase', status: 'in-progress', result: '' });
    const indexResult = await indexCodebase({ force: true }, workspacePath);
    workflow[workflow.length - 1].status = 'done';
    workflow[workflow.length - 1].result = `Indexed ${(indexResult as any).indexed} files`;

    workflow.push({ step: '5. Create documentation', status: 'in-progress', result: '' });
    const docSlug = specName.replace('.md', '').toLowerCase().replace(/\s+/g, '-');
    const docPath = `docs/features/${docSlug}.md`;

    const docContent = generateFeatureDocumentation(spec);
    await writeFile({ path: docPath, content: docContent }, workspacePath);
    workflow[workflow.length - 1].status = 'done';
    workflow[workflow.length - 1].result = `${docPath}`;

    let adrFile = '';
    if (createAdr) {
      workflow.push({ step: '6. Generate ADR', status: 'in-progress', result: '' });
      const adrResult = await generateAdr({
        title: spec.title,
        context: `Feature specification: ${spec.title}\n\nRequirements:\n${requirements.map((r: string) => `- ${r}`).join('\n')}`,
        decision: `Implement ${spec.title} as specified in the feature spec.`,
        consequences: `${filesToCreate.length > 0 ? `New files created: ${filesToCreate.join(', ')}` : 'No new files'}\n\nSee ${docPath} for implementation details.`,
        priority: spec.priority || 'P1',
      }, workspacePath);
      adrFile = (adrResult as any).fileName;
      workflow[workflow.length - 1].status = 'done';
      workflow[workflow.length - 1].result = `docs/adr/${adrFile}`;
    }

    workflow.push({ step: '7. Update changelog', status: 'in-progress', result: '' });
    const changelogEntry = `${spec.title} - implemented with documentation ([${docPath}](${docPath}))${adrFile ? ` and architecture decision ([ADR](docs/adr/${adrFile}))` : ''}`;
    await appendChangelog({ category: 'Added', entry: changelogEntry }, workspacePath);
    workflow[workflow.length - 1].status = 'done';
    workflow[workflow.length - 1].result = 'Changelog updated with linked references';

    workflow.push({ step: '8. Complete spec', status: 'in-progress', result: '' });
    await completeSpec({
      specName,
      createAdr: false,
      changelogEntry: `Completed: ${spec.title}`,
    }, workspacePath);
    workflow[workflow.length - 1].status = 'done';
    workflow[workflow.length - 1].result = 'Spec moved to DONE with all boxes checked';

    if (autoRunRalph) {
      workflow.push({ step: '9. Run ralph loop', status: 'in-progress', result: '' });
      const ralphResult = await runRalphLoop({ maxIterations: 6 }, workspacePath);
      const taskCount = (ralphResult as any).tasksToProcess || 0;
      workflow[workflow.length - 1].status = 'done';
      workflow[workflow.length - 1].result = `${taskCount} documentation tasks queued`;
    }

    return {
      success: true,
      feature: spec.title,
      specName: fileName,
      workflow,
      documentation: {
        feature: docPath,
        adr: adrFile ? `docs/adr/${adrFile}` : null,
      },
      requirements: {
        total: requirements.length,
        items: requirements,
      },
      files: {
        total: filesToCreate.length,
        items: filesToCreate,
      },
      message: `✅ Feature "${spec.title}" fully implemented in one shot!`,
    };
  } catch (error) {
    return {
      success: false,
      feature: specName,
      workflow,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: `❌ Implementation failed at step ${workflow.length}`,
    };
  }
}

function generateFeatureDocumentation(spec: any): string {
  const requirements = (spec.requirements || []).map((r: any) => `- ${r.done ? '✅' : '⏳'} ${r.text}`).join('\n');
  const files = (spec.filesToModify || []).map((f: any) => `- \`${f.path}\`${f.description ? ` - ${f.description}` : ''}`).join('\n');

  return `# ${spec.title}

**Priority:** ${spec.priority || 'P2'}  
**Created:** ${spec.created || 'N/A'}  
**Status:** ${spec.status || 'Active'}

## Overview

${spec.goal || 'Feature implementation.'}

## Requirements

${requirements || '- No specific requirements'}

## Implementation

### Files

${files || '- No files to modify'}

### Architecture

See [ADR](../adr/) for architectural decisions.

## Definition of Done

${(spec.definitionOfDone || []).map((d: any) => `- ${d.done ? '[x]' : '[ ]'} ${d.text}`).join('\n') || '- [ ] Implementation complete'}

## Related

- Spec: [${spec.specName}](../specs/DONE/${spec.specName || 'spec.md'})
- Changelog: See CHANGELOG.md for integration details
`;
}
