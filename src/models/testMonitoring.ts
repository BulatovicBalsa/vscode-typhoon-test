import * as vscode from 'vscode';

export enum TestStatus {
    Running = 'running',
    Passed = 'passed',
    Failed = 'failed',
    XFailed = 'xfailed',
    Skipped = 'skipped',
    XPassed = 'xpassed',
    Error = 'error',
    Interrupted = 'interrupted',
    Collected = 'collected',
}

function statusStringToEnum(status: string): TestStatus {
    status = status.trim().toLowerCase();
    switch (status) {
        case 'passed':
            return TestStatus.Passed;
        case 'failed':
            return TestStatus.Failed;
        case 'xfail':
            return TestStatus.XFailed;
        case 'skipped':
            return TestStatus.Skipped;
        case 'xpass':
            return TestStatus.XPassed;
        case 'error':
            return TestStatus.Error;
        default:
            return TestStatus.Running;
    }
}

export function matchStatus(line: string): TestStatus | undefined {
    const passMatch = line.match(/PASSED/i);
    const failMatch = line.match(/FAILED/i);
    const skipMatch = line.match(/SKIPPED/i);
    const xfailMatch = line.match(/XFAIL/i);
    const xpassMatch = line.match(/XPASS/i);
    const errorMatch = line.match(/ERROR/i);

    const statusMatches = [passMatch, failMatch, skipMatch, xfailMatch, xpassMatch, errorMatch];
    const statusString = statusMatches.find(match => match !== null)?.[0];

    return statusString ? statusStringToEnum(statusString) : undefined;
}


export class TestItem extends vscode.TreeItem {
    static readonly IgnoreContextValue = 'ignore context value';
    private children: TestItem[] = [];
    parent?: TestItem;

    constructor(
        public readonly identifier: string,
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public status: TestStatus,
    ) {
        super(label, collapsibleState);
        this.setIcon();
        this.contextValue = identifier === TestItem.IgnoreContextValue ? undefined :
            this.IsFolder ? 'testItem.folder' : 'testItem';
        this.tooltip = identifier;
    }

    get details(): TestNameDetails {
        return extractTestNameDetails(this.identifier);
    }

    get IsFolder(): boolean {
        return !this.identifier.includes('.py');
    }

    setIcon(): void {
        switch (this.status) {
            case TestStatus.Running:
                this.iconPath = new vscode.ThemeIcon('sync~spin');
                break;
            case TestStatus.Passed:
                this.iconPath = new vscode.ThemeIcon('pass');
                break;
            case TestStatus.Failed:
                this.iconPath = new vscode.ThemeIcon('error');
                break;
            case TestStatus.XFailed:
                this.iconPath = new vscode.ThemeIcon('warning');
                break;
            case TestStatus.Skipped:
                this.iconPath = new vscode.ThemeIcon('circle-outline');
                break;
            case TestStatus.XPassed:
                this.iconPath = new vscode.ThemeIcon('check');
                break;
            case TestStatus.Error:
                this.iconPath = new vscode.ThemeIcon('error');
                break;
            case TestStatus.Interrupted:
                this.iconPath = new vscode.ThemeIcon('stop');
                break;
            case TestStatus.Collected:
                if (!this.identifier.includes('.py')) { // Folder
                    this.iconPath = new vscode.ThemeIcon('symbol-folder');
                    break;
                }
                if (this.identifier.includes('[')) { // Function
                    this.iconPath = new vscode.ThemeIcon('symbol-key');
                    break;
                }
                
                const parts = this.identifier.split('::');
                if (parts.length === 1) { // Module
                    this.iconPath = new vscode.ThemeIcon('symbol-module');
                    break;
                }
                if (parts.length === 2) { // Function or Class
                    this.iconPath = this.details.class ? new vscode.ThemeIcon('symbol-class') : new vscode.ThemeIcon('symbol-function');
                    break;
                }
                if (parts.length === 3) { // Class method
                    this.iconPath = new vscode.ThemeIcon('symbol-method');
                    break;
                }
        }
    }

    setStatus(status: TestStatus) {
        this.status = status;
        this.setIcon();
        this.description = (status as string).toUpperCase();
    }

    addChild(child: TestItem) {
        this.children.push(child);
        child.parent = this;
        this.updateStatus();
    }

    getChildren() {
        return [...this.children];
    }

    private updateStatus() {
        const statuses = this.children.map(child => child.status);
        if (statuses.includes(TestStatus.Collected)) {
            this.setStatus(TestStatus.Collected);
        } else if (statuses.includes(TestStatus.Interrupted)) {
            this.setStatus(TestStatus.Interrupted);
        } else if (statuses.includes(TestStatus.Running)) {
            this.setStatus(TestStatus.Running);
        } else if (statuses.includes(TestStatus.Error)) {
            this.setStatus(TestStatus.Error);
        } else if (statuses.includes(TestStatus.Failed)) {
            this.setStatus(TestStatus.Failed);
        } else if (statuses.includes(TestStatus.XFailed)) {
            this.setStatus(TestStatus.XFailed);
        } else if (statuses.includes(TestStatus.Skipped)) {
            this.setStatus(TestStatus.Skipped);
        } else if (statuses.includes(TestStatus.XPassed)) {
            this.setStatus(TestStatus.XPassed);
        } else {
            this.setStatus(TestStatus.Passed);
        }

        if (this.parent) {
            this.parent.updateStatus();
        }
    }

    update(status: TestStatus) {
        this.setStatus(status);
        this.parent?.updateStatus();
    }
}

export interface TestNameDetails {
    fullTestName: string; // path/to/module.py::class_name_optional::testName[params]
    folders: string[];
    name: string;
    module: string;
    class?: string;
    params?: string;
}

export function extractTestNameDetails(fullTestName: string): TestNameDetails {
    const [testPath = '', classOrTestName = '', testNameWithParams = ''] = fullTestName.split('::');
    
    // Extract test name (without params) and parameters if they exist
    const testName = testNameWithParams?.split('[')[0] || classOrTestName?.split('[')[0] || ''; 
    const params = fullTestName.split('[')[1]?.split(']')[0] || '';

    // Extract folders and module (module is the last part of the path)
    const folders = testPath ? testPath.split('/').slice(0, -1) : ['']; // Folders (exclude module)
    const module = testPath ? testPath.split('/').pop() || '' : '';     // Module is the last part of testPath

    // Handle class name (only exists if there are three parts)
    const className = testNameWithParams ? classOrTestName : '';

    return { fullTestName, name: testName, module, class: className, params, folders };
}

export function generateDummyTestItem(): TestItem {
    return new TestItem(TestItem.IgnoreContextValue, 'Running...', vscode.TreeItemCollapsibleState.None, TestStatus.Running);
}