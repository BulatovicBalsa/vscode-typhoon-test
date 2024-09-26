import * as cp from 'child_process';
import { TestTreeProvider } from '../views/TestTreeProvider';
import * as vscode from 'vscode';
import { PytestArgumentBuilder } from './PytestArgumentBuilder';
import { getTestRunConfig } from '../utils/config';
import { getPlatform } from '../utils/platform/selector';
import { extractTestNameDetails } from './testMonitoring';


export enum InterpreterType {
    System = 'system',
    Embedded = 'embedded',
    Custom = 'custom'
}

export interface TestRunConfig {
    interpreterType: InterpreterType;
    customInterpreterPath?: string;
    realTimeLogs: boolean;
    openReport: boolean;
    cleanOldResults: boolean;
    pdfReport: boolean;
    selectTestByName?: string;
    selectTestByMark?: string;
    additionalOptions?: string;
    verbose: boolean;
}

export class PytestRunner {
    private static running = false;
    private pytestProcess?: cp.ChildProcess;
    private outputChannel: vscode.OutputChannel;
    private testRunEndChecker: TestRunEndChecker;
    private wasKilled: boolean;
    private errorOccured: boolean;
    private argumentBuilder: PytestArgumentBuilder;
    
    constructor(private testTreeProvider: TestTreeProvider, testScope?: string, builderType: new (testScope?: string) => PytestArgumentBuilder = PytestArgumentBuilder
    ) {
        testTreeProvider.clearTests();
        this.outputChannel = vscode.window.createOutputChannel('Pytest Output', 'python');
        this.testRunEndChecker = new TestRunEndChecker();
        this.wasKilled = false;
        this.errorOccured = false;
        this.argumentBuilder = new builderType(testScope);
    }
    
    private handleProcessExit(resolve: () => void, reject: () => void) {
        PytestRunner.isRunning = false;
        this.testTreeProvider.clearInit();

        if (this.errorOccured || this.wasKilled) {
            return reject();
        }
        
        runAllureReport();
        resolve();
    }

    private addCollectOnlyTests(rawOutput: string) {
        const rawCollectOnlyOutput = rawOutput.match(/[\w\/\\\-\.]+\.py::[\w\-]+(?:::[\w\-]+)?(?:\[[^\]]*\])?/g) || [];
        const details = rawCollectOnlyOutput.map(extractTestNameDetails);
        details.forEach(testDetails => {
            this.testTreeProvider.addCollectOnlyTest(testDetails);
        });
    }
    
    private handleProcessOutput(data: Buffer) {
        const output = data.toString();
        
        if (output.includes('Report successfully generated')) {
            this.outputChannel.appendLine('\n');
        }
        
        this.outputChannel.append(output);
        
        if (this.argumentBuilder.isCollectOnly() && this.argumentBuilder.isQuiet()) {
            this.addCollectOnlyTests(output);
            return;
        }

        const lines = output.split('\n');
        lines.forEach(line => {
            if (!this.testRunEndChecker.check(line)) {
                this.testTreeProvider.handleTestOutput(line);
            }
        });
    }
    
    private handleProcessError(data: Buffer) {
        const output = data.toString();
        this.outputChannel.append(output);
        this.errorOccured = true;
    }

    private initProcess() {
        const path = this.argumentBuilder.getPythonPath();
        const flags = this.argumentBuilder.getFlags();

        return cp.spawn(path, flags, {
            shell: true,
            cwd: vscode.workspace.workspaceFolders![0].uri.fsPath
        });
    }
    
    private addProcessListeners(resolve: () => void, reject: () => void) {
        this.pytestProcess?.stdout?.on('data', this.handleProcessOutput.bind(this));
        this.pytestProcess?.stderr?.on('data', this.handleProcessError.bind(this));
        this.pytestProcess?.on('exit', this.handleProcessExit.bind(this, resolve, reject));
        this.pytestProcess?.on('error', (e) => {
            this.outputChannel.appendLine(e.message);
            reject();
        });
    }
    
    run(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (PytestRunner.isRunning) {
                return reject();
            }
            
            this.testTreeProvider.init();
            
            this.outputChannel.show(true);
            this.outputChannel.appendLine('TEST RUN STARTED...');
            
            this.pytestProcess = this.initProcess();
            PytestRunner.isRunning = true;
            this.addProcessListeners(resolve, reject);
        });
    }
    
    stop() {
        if (this.pytestProcess) {
            this.wasKilled = true;
            
            try {
                getPlatform().killProcess(this.pytestProcess.pid);
                PytestRunner.isRunning = false;
            } catch (e) {
                this.wasKilled = false;
                PytestRunner.isRunning = true;
                return;
            }
            
            this.testTreeProvider.clearInit();
            this.testTreeProvider.handleInterrupt();
            this.outputChannel.appendLine('\nTEST RUN INTERRUPTED');
        }
    }
    
    public static get IsRunning(): boolean {
        return this.running;
    }

    private static set isRunning(value: boolean) {
        this.running = value;
        vscode.commands.executeCommand('setContext', 'typhoon-test.isRunning', value);
    }
}

class TestRunEndChecker {
    private hasEnded = false;
    
    check(line: string) {
        return this.hasEnded || (this.hasEnded = this.isTestRunEnd(line));
    }
    
    private isTestRunEnd(line: string) {
        return line.includes('===') && !line.includes('test session starts');
    }
}

function runAllureReport() {
    if (getTestRunConfig().openReport) {
        const terminal = vscode.window.createTerminal('Allure Report');
        terminal.show();
        terminal.sendText('typhoon-allure serve report');
    }
}
