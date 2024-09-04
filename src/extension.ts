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
import {refreshConfigs} from './utils/config';
import {runTests} from './commands/runTests';
import {TestTreeProvider} from './views/TestTreeProvider';
import {pickOrganizationalLogoFilepath} from './commands/pickOrganizationalLogoFilepath';
import {refreshPdfConfig} from './utils/pdfConfig';
import { stopTests } from './commands/stopTests';

export function activate(context: vscode.ExtensionContext) {
    let sidebarProvider = new DocumentationProvider(context.extensionUri);
    let formProvider = new ArgumentsProvider(context.extensionUri);
    let testTreeProvider = new TestTreeProvider();
    let resolveTestPromise: (() => void) | undefined;

    vscode.window.registerWebviewViewProvider('typhoon-test.docstringView', sidebarProvider);
    vscode.window.registerWebviewViewProvider('typhoon-test.argumentsView', formProvider);
    vscode.window.registerTreeDataProvider('typhoon-test.pythonEntityView', getPythonEntityTreeProvider());
    vscode.window.registerTreeDataProvider('typhoon-test.pytestMonitorView', testTreeProvider);

    context.subscriptions.push(vscode.commands.registerCommand('typhoon-test.showDocstringView', (item: TreeNode) =>
        showDocstringView(sidebarProvider, item)
    ));

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.showArgumentsView', (item: TreeNode) => {
            showArgumentsView(formProvider, item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.handleTreeViewItemClicked', (item: TreeNode) => {
            handleTreeViewItemClicked(item);
        })
    );

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
            vscode.commands.executeCommand('workbench.action.openSettings', 'typhoon-test.testRun').then();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.openPdfConfiguration', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'typhoon-test.pdfConfiguration').then();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.pickInterpreterPath', () => {
            pickInterpreterPath();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.stopTests', () => {
            stopTests();
            resolveTestPromise?.();
            resolveTestPromise = undefined;
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.runTests', () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Running tests from workspace',
                cancellable: true
            }, (_, token) => {
                return new Promise<void>((resolve, reject) => {
                    resolveTestPromise = resolve;

                    token.onCancellationRequested(() => {
                        vscode.commands.executeCommand('typhoon-test.stopTests').then(() => {
                            vscode.window.showInformationMessage('Test run was cancelled');
                        });
                    });
    
                    runTests(testTreeProvider).then(() => {
                        resolve();
                    }).catch(() => {
                        reject();
                    });
                });
            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.runTestsFromFile', () => {
            const activeFile = vscode.window.activeTextEditor?.document.fileName;
            if (!activeFile) {
                vscode.window.showErrorMessage('No file is currently open');
                return;
            }

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Running tests from file',
                cancellable: true
            }, (_, token) => {
                return new Promise<void>((resolve, reject) => {
                    resolveTestPromise = resolve;

                    token.onCancellationRequested(() => {
                        vscode.commands.executeCommand('typhoon-test.stopTests').then(() => {
                            vscode.window.showInformationMessage('Test run was cancelled');
                        });
                    });
    
                    runTests(testTreeProvider, activeFile).then(() => {
                        resolve();
                    }).catch(() => {
                        reject();
                    });
                });
            });
        })
    );


    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.pickOrganizationalLogoFilepath', (isGlobal) => {
            pickOrganizationalLogoFilepath(isGlobal);
        })
    );

    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('typhoon-test.apiWizardWorkspace')) {
            refreshConfigs();
            getPythonEntityTreeProvider().loadEntitiesFromWorkspace().then();
        }
        if (event.affectsConfiguration('typhoon-test.testRun')) {
            refreshConfigs();
        }
        if (event.affectsConfiguration('typhoon-test')) {
            refreshConfigs();
        }
        if (event.affectsConfiguration('typhoon-test.pdfConfiguration')) {
            refreshPdfConfig();
        }
    });
}
