// extension.ts
import * as vscode from 'vscode';
import {DocumentationProvider} from './views/DocumentationProvider';
import {showDocstringView} from './commands/showDocstringView';
import {ArgumentsProvider} from './views/ArgumentsProvider';
import {showArgumentsView} from './commands/showArgumentsView';
import {handleTreeViewItemClicked} from './commands/handleTreeViewItemClicked';
import {addPythonEntity} from './commands/addPythonEntity';
import {saveApiWizardWorkspace} from './commands/saveApiWizardWorkspace';
import {TreeNode} from "./models/TreeNode";
import {getPythonEntityTreeProvider} from "./views/PythonEntityTreeProvider";
import {removePythonEntity} from "./commands/removePythonEntity";
import {pickInterpreterPath} from "./commands/pickInterpreterPath";
import { updateEmbeddedInterpreterPath } from './commands/updateEmbeddedInterpreterPath';
import { getTestRunConfig, refreshConfigs } from './utils/config';
import { getPlatform } from './utils/platform/index';
import { runTests } from './commands/runTests';
import { cleanOldResults } from './commands/cleanOldResults';
import { createWebviewPanel } from './ww';
import { trackTests } from './x';

export function activate(context: vscode.ExtensionContext) {
    let sidebarProvider = new DocumentationProvider(context.extensionUri);
    let formProvider = new ArgumentsProvider(context.extensionUri);

    vscode.window.registerWebviewViewProvider('typhoon-test.docstringView', sidebarProvider);
    vscode.window.registerWebviewViewProvider('typhoon-test.argumentsView', formProvider);
    vscode.window.registerTreeDataProvider('typhoon-test.pythonEntityView', getPythonEntityTreeProvider());

    context.subscriptions.push(vscode.commands.registerCommand('typhoon-test.showDocstringView', (item: TreeNode) =>
        showDocstringView(sidebarProvider, item)
    ));

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.showArgumentsView', (item: TreeNode) => {
                showArgumentsView(formProvider, item);
            }
        ));

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.handleTreeViewItemClicked', (item: TreeNode) => {
                handleTreeViewItemClicked(item);
            }
        ));

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.addPythonEntity', () => {
            addPythonEntity().then();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.removePythonEntity', (item: TreeNode) => {
            removePythonEntity(item).then();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.saveApiWizardWorkspace', () => {
            saveApiWizardWorkspace();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.openTestRunConfiguration', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'testRun');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.pickInterpreterPath', () => {
            pickInterpreterPath();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.updateEmbeddedInterpreterPath', () => {
            updateEmbeddedInterpreterPath();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.runTestsx', () => {
            runTests();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.cleanOldResults', () => {
            cleanOldResults();
        })
    );
    
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('typhoon-test.apiWizardWorkspace')) {
            getPythonEntityTreeProvider().loadEntitiesFromWorkspace().then();
        }
        if (event.affectsConfiguration('typhoon-test.testRun')) {
            refreshConfigs();
            checkEmbeddedInterpreterPath();
        }
        if (event.affectsConfiguration('typhoon-test')) {
            refreshConfigs();
        }
    });

    checkEmbeddedInterpreterPath();

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.runTests', () => {
            const pathToPython = 'path_to_python';
            const allureDir = 'allure_output_directory';
            const panel = createWebviewPanel();

            trackTests(panel);
        })
    );
}

function checkEmbeddedInterpreterPath() {
    const currentPath = getTestRunConfig().embeddedInterpreterPath;
    const possiblePath = getPlatform().getEmbeddedPythonPath();
    
    if (!currentPath) {
        vscode.commands.executeCommand('typhoon-test.updateEmbeddedInterpreterPath');
        return;
    }

    if (currentPath !== possiblePath) {
        vscode.window.showWarningMessage('We have detected a new embedded interpreter path. Do you want to update it?', 'Yes', 'No').then(value => {
            if (value === 'Yes') {
                updateEmbeddedInterpreterPath();
            }
        });
    }
}

export function deactivate() {
}
