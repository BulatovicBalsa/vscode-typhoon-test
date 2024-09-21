import * as vscode from 'vscode';
import { extractTestNameDetails, generateDummyTestItem, matchStatus, TestItem, TestNameDetails, TestStatus } from '../models/testMonitoring';


export class TestTreeProvider implements vscode.TreeDataProvider<TestItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TestItem | undefined | void> = new vscode.EventEmitter<TestItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TestItem | undefined | void> = this._onDidChangeTreeData.event;

    private tests: TestItem[] = [];
    private lastTest: TestItem | undefined;
    private readonly dummyTest = generateDummyTestItem();

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
        test.update(status);
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
        const parametrizedTest = new TestItem(testNameDetails.fullTestName, testNameDetails.params!, vscode.TreeItemCollapsibleState.None, status, testNameDetails);
        parent.addChild(parametrizedTest);
        this.lastTest = parametrizedTest;
    }

    private createChildTestItem(testNameDetails: TestNameDetails, status: TestStatus, parent: TestItem, isExpandable: boolean): TestItem {
        let testNameItem = parent.getChildren().find(t => t.label === testNameDetails.name);
        if (testNameItem) {
            return testNameItem;
        }
        const collapsibleState = isExpandable ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        const id = testNameDetails.params ? testNameDetails.fullTestName.split('[')[0] : testNameDetails.fullTestName;

        const newTest = new TestItem(id, testNameDetails.name, collapsibleState, status, testNameDetails);
        parent.addChild(newTest);
        this.lastTest = newTest;
        return newTest;
    }

    private createTestPathItem(testNameDetails: TestNameDetails) {
        let testPathItem = this.findTestPath(testNameDetails.module);
        if (!testPathItem) {
            testPathItem = new TestItem(testNameDetails.module, testNameDetails.module, vscode.TreeItemCollapsibleState.Collapsed, TestStatus.Running, testNameDetails);
            this.tests.push(testPathItem);
        }
        return testPathItem;
    }

    addOrUpdateTest(testName: TestNameDetails, status: TestStatus): void {
        this.clearInit();
        const test = this.findTest(testName);
        test ? this.updateTest(testName, status) : this.addTest(testName, status);
        this.refresh();
    }

    addCollectOnlyTest(testName: TestNameDetails): void {
        this.addTest(testName, TestStatus.Collected);
        this.lastTest?.setStatus(TestStatus.Collected);
        this.refresh();
    }

    private findTest(testName: TestNameDetails): TestItem | undefined {
        const testPathNode = this.findTestPath(testName.module);
        if (!testPathNode) {
            return undefined;
        }

        const test = testPathNode.getChildren().find(t => t.label === testName.name);
        if (!test || !testName.params) {
            return test;
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
            const lastTestNameDetails = lastTest.details;
            this.updateTest(lastTestNameDetails, status);
            this.refresh();
        }
    }

    init() {
        this.tests.push(this.dummyTest);
        this.refresh();
    }

    clearInit() {
        if (this.tests.includes(this.dummyTest)) {
            this.tests.splice(this.tests.indexOf(this.dummyTest), 1);
        }
        this.refresh();
    }

    private getRunningTests(): TestItem[] {
        return this.getFlattenTests().filter(test => test.status === TestStatus.Running)
            .filter(test => test.getChildren().length === 0);
    }

    private getFlattenTests(tests: TestItem[] = this.tests): TestItem[] {
        return tests.flatMap(test => [test, ...this.getFlattenTests(test.getChildren())]);
    }

    handleInterrupt() {
        let t = this.getFlattenTests(this.tests);
        this.getRunningTests().forEach(test => test.update(TestStatus.Interrupted));
        this.refresh();
    }

    handleTestOutput(line: string) {
        line = line.replace(/\s+/g, ' ').trim();

        const testNameMatch = line.split(' ')[0]?.match(/^(test_.*|.*_test)/); // TODO: Improve regex
        const testDetailsString = line.split(' ')[0];
        const statusMatch = matchStatus(line);

        if (testNameMatch) {
            const testNameDetails = extractTestNameDetails(testDetailsString);
            const testName = testNameDetails.fullTestName;

            if (!this.containsTest(testName)) {
                this.addOrUpdateTest(testNameDetails, TestStatus.Running);
            }

            if (statusMatch) {
                this.addOrUpdateTest(testNameDetails, statusMatch);
            }
        }
        else if (statusMatch) {
            this.updateLastTest(statusMatch);
        }
    }
}