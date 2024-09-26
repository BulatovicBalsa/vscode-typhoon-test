import vscode from 'vscode';
import {PythonImport} from "../models/pythonEntity";
import {InterpreterType, TestRunConfig} from '../models/testRun';
import { getPlatform } from './platform/selector';

let config = vscode.workspace.getConfiguration('typhoon-test');
let testRunConfig = vscode.workspace.getConfiguration('typhoon-test.testRun');

export function refreshConfigs() {
    config = vscode.workspace.getConfiguration('typhoon-test');
    testRunConfig = vscode.workspace.getConfiguration('typhoon-test.testRun');
}

export function loadWorkspaceElements(): PythonImport[] {
    return config.get<PythonImport[]>('apiWizardWorkspace', []);
}

export async function updateWorkspaceElements(elements: PythonImport[]) {
    config.update('apiWizardWorkspace', elements, vscode.ConfigurationTarget.Global);
}

export function getLineSpacing(): string {
    const lineSpacingCount = config.get<number>('lineSpacing')!;
    return '\n'.repeat(lineSpacingCount);
}

export function getTestRunConfig(): TestRunConfig {
    return {
        interpreterType: getInterpreterType() as InterpreterType,
        customInterpreterPath: getCustomInterpreterPath(),
        realTimeLogs: getRealTimeLogs(),
        openReport: getOpenReport(),
        cleanOldResults: getCleanOldResults(),
        pdfReport: getPdfReport(),
        selectTestByName: getSelectTestByName(),
        selectTestByMark: getSelectTestByMark(),
        additionalOptions: getAdditionalOptions(),
        verbose: getVerbose()
    };
}

export function getPythonInterpreterCommand(): string {
    const platform = getPlatform();
    switch (getInterpreterType()) {
        case InterpreterType.System:
            return platform.getPythonCommand();
        case InterpreterType.Embedded:
            return platform.getEmbeddedPythonCommand();
        case InterpreterType.Custom:
            return `"${getCustomInterpreterPath()}"`;
    }
}

export function getPythonInterpreterCommandOptions(): string[] {
    const platform = getPlatform();
    return [platform.getEmbeddedPythonCommand(), platform.getPythonCommand(), getCustomInterpreterPath() || ''].filter(Boolean);
}

function getInterpreterType(): InterpreterType {
    return testRunConfig.get<string>('interpreter', "embedded") as InterpreterType;
}

function getCustomInterpreterPath(): string | undefined {
    let path = testRunConfig.get<string | undefined>('customInterpreterPath');
    return path && path.trim() ? path : undefined;
}

function getRealTimeLogs(): boolean {
    return testRunConfig.get<boolean>('realTimeLogs', false);
}

function getOpenReport(): boolean {
    return testRunConfig.get<boolean>('openReport', true);
}

function getCleanOldResults(): boolean {
    return testRunConfig.get<boolean>('cleanOldResults', false);
}

function getPdfReport(): boolean {
    return testRunConfig.get<boolean>('pdfReport', false);
}

function getSelectTestByName(): string | undefined {
    let name = testRunConfig.get<string | undefined>('selectTestByName');
    return name && name.trim() ? name : undefined;
}

function getSelectTestByMark(): string | undefined {
    let mark = testRunConfig.get<string | undefined>('selectTestByMark');
    return mark && mark.trim() ? mark : undefined;
}

function getAdditionalOptions(): string | undefined {
    let options = testRunConfig.get<string | undefined>('additionalOptions');
    return options && options.trim() ? options : undefined;
}

function getVerbose(): boolean {
    return testRunConfig.get<boolean>('verbose', true);
}

export async function updateCustomInterpreterPath(path: string) {
    await testRunConfig.update('customInterpreterPath', path, vscode.ConfigurationTarget.Global);
}