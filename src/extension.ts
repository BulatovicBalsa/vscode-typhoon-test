import * as vscode from 'vscode';
import { DocumentationProvider } from './views/DocumentationProvider';
import { showDocstringView } from './commands/showDocstringView';
import { ArgumentsProvider } from './views/ArgumentsProvider';
import { showArgumentsView } from './commands/showArgumentsView';
import { handleTreeViewItemClicked } from './commands/handleTreeViewItemClicked';
import { addPythonEntity } from './commands/addPythonEntity';
import { saveApiWizardWorkspace } from './commands/saveApiWizardWorkspace';
import { TreeNode } from "./models/TreeNode";
import { getPythonEntityTreeProvider } from "./views/PythonEntityTreeProvider";
import { removePythonEntity } from "./commands/removePythonEntity";
import { pickInterpreterPath } from "./commands/pickInterpreterPath";
import { refreshConfigs } from './utils/config';
import { runTests, stopTests } from './commands/runAndStopTests';
import { TestTreeProvider } from './views/TestTreeProvider';
import { pickOrganizationalLogoFilepath } from './commands/pickOrganizationalLogoFilepath';
import { refreshPdfConfig } from './utils/pdfConfig';
import { ConfigurationWebviewProvider } from './views/ConfigurationWebviewProvider';
import { TestItem } from './models/testMonitoring';
import { PytestRunner } from './models/testRun';
import { CollectOnlyPytestArgumentBuilder, PytestArgumentBuilder } from './models/PytestArgumentBuilder';
import { PytestCodeLensProvider } from './codelens/PytestCodeLensProvider';
import { viewTestInCode } from './commands/viewTestInCode';

export function activate(context: vscode.ExtensionContext) {
    let sidebarProvider = new DocumentationProvider(context.extensionUri);
    let formProvider = new ArgumentsProvider(context.extensionUri);
    let testTreeProvider = new TestTreeProvider();
    let pdfConfigurationProvider = new ConfigurationWebviewProvider(context.extensionUri, 'typhoon-test.pdfConfiguration');
    let testRunConfigurationProvider = new ConfigurationWebviewProvider(context.extensionUri, 'typhoon-test.testRun');
    let resolveTestPromise: (() => void) | undefined;

    vscode.window.registerWebviewViewProvider('typhoon-test.docstringView', sidebarProvider);
    vscode.window.registerWebviewViewProvider('typhoon-test.argumentsView', formProvider);
    vscode.window.registerTreeDataProvider('typhoon-test.pythonEntityView', getPythonEntityTreeProvider());
    vscode.window.registerTreeDataProvider('typhoon-test.pytestMonitorView', testTreeProvider);
    vscode.window.registerWebviewViewProvider('typhoon-test.pdfConfigurationView', pdfConfigurationProvider);
    vscode.window.registerWebviewViewProvider('typhoon-test.testRunConfigurationView', testRunConfigurationProvider);

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
        vscode.commands.registerCommand('typhoon-test.runTests', (testName?: string) => {
            if (checkTestRunEnd()) {
                return;
            }

            if (typeof testName !== 'string') {
                testName = undefined;
            }

            if (!testName) {
                testName = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
                if (!testName) {
                    vscode.window.showErrorMessage('No workspace is currently open');
                    return;
                }
            }

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Running ${getDisplayTestName(testName)}`,
                cancellable: true
            }, (_, token) => {
                return getRunTestPromise(token, testName);
            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.runTestsFromFile', () => {
            const activeFile = vscode.window.activeTextEditor?.document.fileName;
            activeFile ? 
                vscode.commands.executeCommand('typhoon-test.runTests', activeFile) :
                vscode.window.showErrorMessage('No file is currently open');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.runTestsFromTestItem', (item: TestItem) => {
            vscode.commands.executeCommand('typhoon-test.runTests', item.identifier);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.runTestsFromExplorer', (uri: vscode.Uri) => {
            vscode.commands.executeCommand('typhoon-test.runTests', uri.fsPath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.collectTests', (testName? :string) => {
            if (checkTestRunEnd()) {
                return;
            }

            if (typeof testName !== 'string') {
                testName = undefined;
            }

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: testName ? `Collecting tests from ${testName}`: 'Collecting tests...',
                cancellable: true
            }, (_, token) => {
                return getRunTestPromise(token, testName, CollectOnlyPytestArgumentBuilder);
            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.collectTestsFromTestItem', (item: TestItem) => {
            vscode.commands.executeCommand('typhoon-test.collectTests', item.identifier);
        })
    );

    context.subscriptions.push(vscode.languages.registerCodeLensProvider(
        { scheme: 'file', language: 'python' },
        new PytestCodeLensProvider()
    ));

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.pickOrganizationalLogoFilepath', () => {
            pickOrganizationalLogoFilepath();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-test.viewTestInCode', (item: TestItem) => {
            viewTestInCode(item.details);
        })
    );

    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('typhoon-test.apiWizardWorkspace')) {
            refreshConfigs();
            getPythonEntityTreeProvider().loadEntitiesFromWorkspace().then();
        }
        if (event.affectsConfiguration('typhoon-test.testRun')) {
            refreshConfigs();
            testRunConfigurationProvider.refresh();
        }
        if (event.affectsConfiguration('typhoon-test')) {
            refreshConfigs();
        }
        if (event.affectsConfiguration('typhoon-test.pdfConfiguration')) {
            refreshPdfConfig();
            pdfConfigurationProvider.refresh();
        }
    });

    function getRunTestPromise(token: any, testName?: string, builderType: any = PytestArgumentBuilder): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            resolveTestPromise = resolve;

            token.onCancellationRequested(() => {
                vscode.commands.executeCommand('typhoon-test.stopTests').then(() => {
                    vscode.window.showInformationMessage('Test run was cancelled');
                });
            });

            runTests(testTreeProvider, testName, builderType).then(() => {
                resolve();
            }).catch(() => {
                reject();
            });
        });
    }

    function checkTestRunEnd(): boolean {
        const res = PytestRunner.IsRunning;
        if (res) {
            vscode.window.showErrorMessage('Test run is still in progress');
        }
        return res;
    }

    function getDisplayTestName(testName: string): string {
        const rootDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!rootDir) {
            return testName;
        }

        let filteredName = testName.replace(rootDir, '') || testName;
        return filteredName.startsWith('/') || filteredName.startsWith('\\') ? filteredName.slice(1) : filteredName;
    }
}
