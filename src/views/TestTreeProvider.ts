import * as vscode from 'vscode';
import { extractTestNameDetails, TestItem, TestNameDetails, TestStatus } from '../models/testMonitoring';


export class TestTreeProvider implements vscode.TreeDataProvider<TestItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TestItem | undefined | void> = new vscode.EventEmitter<TestItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TestItem | undefined | void> = this._onDidChangeTreeData.event;

    private tests: TestItem[] = [];
    private lastTest: TestItem | undefined;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TestItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TestItem): vscode.ProviderResult<TestItem[]> {
        if (element) {
            return element.getChildren();
        } else {
            return this.tests;
        }
    }

    private updateTest(testNameDetails: TestNameDetails, status: TestStatus): void {
        const test = this.findTest(testNameDetails)!;
        test.update(status)
    }

    private addTest(testNameDetails: TestNameDetails, status: TestStatus): void {
        const isParametrized = testNameDetails.params !== undefined;
        const testPathItem = this.createTestPathItem(testNameDetails);
        const newTest = this.createChildTestItem(testNameDetails, status, testPathItem, isParametrized);
        if (isParametrized) {
            this.createParametrizedTestItem(testNameDetails, status, newTest);
        }
    }

    private createParametrizedTestItem(testNameDetails: TestNameDetails, status: TestStatus, parent: TestItem) {
        const parametrizedTest = new TestItem(testNameDetails.params!, vscode.TreeItemCollapsibleState.None, status);
        parent.addChild(parametrizedTest);
        this.lastTest = parametrizedTest;
    }

    private createChildTestItem(testNameDetails: TestNameDetails, status: TestStatus, parent: TestItem, isExpandable: boolean): TestItem {
        let testNameItem = parent.getChildren().find(t => t.label === testNameDetails.testName);
        if (testNameItem) {
            return testNameItem;
        } 
        const collapsibleState = isExpandable ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;
        const newTest = new TestItem(testNameDetails.testName, collapsibleState, status);
        parent.addChild(newTest);
        this.lastTest = newTest;
        return newTest;
    }

    private createTestPathItem(testNameDetails: TestNameDetails) {
        let testPathItem = this.findTestPath(testNameDetails.testPath);
        if (!testPathItem) {
            testPathItem = new TestItem(testNameDetails.testPath, vscode.TreeItemCollapsibleState.Expanded, TestStatus.Running);
            this.tests.push(testPathItem);
        }
        return testPathItem;
    }

    addOrUpdateTest(testName: TestNameDetails, status: TestStatus): void {
        const test = this.findTest(testName);
        test ? this.updateTest(testName, status) : this.addTest(testName, status);
        this.refresh();
    }

    private findTest(testName: TestNameDetails): TestItem | undefined {
        const testPathNode = this.findTestPath(testName.testPath);
        if (!testPathNode) {
            return undefined;
        }

        const test = testPathNode.getChildren().find(t => t.label === testName.testName);
        if (!test || !testName.params) {
            return test
        }
        
        return test.getChildren().find(t => t.label === testName.params);
    }

    private findTestPath(testPath: string): TestItem | undefined {
        return this.tests.find(t => t.label === testPath);
    }

    containsTest(testName: string): boolean {
        return this.tests.some(t => t.label === testName);
    }

    clearTests(): void {
        this.tests = [];
        this.lastTest = undefined;
        this.refresh();
    }

    updateLastTest(status: TestStatus) {
        if (this.tests) {
            const lastTest = this.lastTest;
            if (!lastTest) { 
                return;
            }
            const lastTestNameDetails = this.getTestNameDetails(lastTest);
            this.updateTest(lastTestNameDetails, status);
            this.refresh();
        }
    }
    
    private getTestNameDetails(test: TestItem) {
        const testPath = this.tests.find(t => t.getChildren().includes(test))?.label;
        // TODO: Add parametrized tests node
        return { fullTestName: `${testPath}::${test.label}`, testName: test.label, testPath: testPath! };
    }
}