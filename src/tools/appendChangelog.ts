import * as vscode from 'vscode';
import * as path from 'path';

/**
 * AppendChangelogTool - Language Model Tool for changelog management
 * 
 * Adds entries to CHANGELOG.md following Keep a Changelog format.
 */

interface AppendChangelogInput {
    version: string;
    category: 'Added' | 'Changed' | 'Deprecated' | 'Removed' | 'Fixed' | 'Security';
    entry: string;
}

interface AppendChangelogResult {
    success: boolean;
    message: string;
}

export class AppendChangelogTool implements vscode.LanguageModelTool<AppendChangelogInput> {
    readonly name = 'doc-architect_append_changelog';
    
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<AppendChangelogInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { version, category, entry } = options.input;
        
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder open');
            }
            
            const changelogPath = path.join(workspaceFolder.uri.fsPath, 'docs', 'CHANGELOG.md');
            const changelogUri = vscode.Uri.file(changelogPath);
            
            // Read existing changelog
            let content: string;
            try {
                const bytes = await vscode.workspace.fs.readFile(changelogUri);
                content = new TextDecoder().decode(bytes);
            } catch {
                // Create new changelog if doesn't exist
                content = this.createNewChangelog();
            }
            
            // Find or create version section
            const versionHeader = version === 'Unreleased' 
                ? '## [Unreleased]'
                : `## [${version}]`;
            
            const categoryHeader = `### ${category}`;
            const entryLine = `- ${entry}`;
            
            let updatedContent: string;
            
            if (content.includes(versionHeader)) {
                // Version exists, find category or add it
                updatedContent = this.addToExistingVersion(content, versionHeader, categoryHeader, entryLine);
            } else {
                // Add new version section
                updatedContent = this.addNewVersion(content, versionHeader, categoryHeader, entryLine);
            }
            
            // Write updated changelog
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(changelogUri, encoder.encode(updatedContent));
            
            const response: AppendChangelogResult = {
                success: true,
                message: `Added ${category} entry to ${version}: "${entry}"`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        } catch (error) {
            const response: AppendChangelogResult = {
                success: false,
                message: `Failed to update changelog: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        }
    }
    
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<AppendChangelogInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { version, category, entry } = options.input;
        
        return {
            invocationMessage: `Adding ${category} entry to changelog...`,
            confirmationMessages: {
                title: 'Update Changelog',
                message: new vscode.MarkdownString(
                    `Add to **${version}** under **${category}**:\n\n- ${entry}`
                )
            }
        };
    }
    
    private createNewChangelog(): string {
        return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

`;
    }
    
    private addToExistingVersion(content: string, versionHeader: string, categoryHeader: string, entryLine: string): string {
        const lines = content.split('\n');
        const versionIndex = lines.findIndex(l => l.startsWith(versionHeader));
        
        if (versionIndex === -1) {
            return content;
        }
        
        // Find category within this version section
        let categoryIndex = -1;
        let nextVersionIndex = lines.length;
        
        for (let i = versionIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('## [')) {
                nextVersionIndex = i;
                break;
            }
            
            if (line === categoryHeader) {
                categoryIndex = i;
            }
        }
        
        if (categoryIndex !== -1) {
            // Category exists, add entry after it
            lines.splice(categoryIndex + 1, 0, entryLine);
        } else {
            // Category doesn't exist, add it before next version
            const insertIndex = nextVersionIndex;
            lines.splice(insertIndex, 0, '', categoryHeader, entryLine);
        }
        
        return lines.join('\n');
    }
    
    private addNewVersion(content: string, versionHeader: string, categoryHeader: string, entryLine: string): string {
        const lines = content.split('\n');
        
        // Find first version header or end of header section
        let insertIndex = lines.findIndex(l => l.startsWith('## ['));
        
        if (insertIndex === -1) {
            insertIndex = lines.length;
        }
        
        const newSection = [
            '',
            versionHeader,
            '',
            categoryHeader,
            entryLine,
            ''
        ];
        
        lines.splice(insertIndex, 0, ...newSection);
        
        return lines.join('\n');
    }
}
