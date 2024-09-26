import { getPythonInterpreterCommand, getTestRunConfig } from "../utils/config";
import { PdfArgumentBuilder } from './pdfGenerator';

export class PytestArgumentBuilder {
    private config = getTestRunConfig();

    constructor(protected readonly testScope?: string) {}

    protected getTestScope(): string {
        return this.testScope ? `"${this.testScope}"` : '';
    }

    protected getInterpreterPath(): string {
        return getPythonInterpreterCommand();
    }

    protected getMarks(): string[] {
        if (this.config.selectTestByMark) {
            return ["-m", `${this.config.selectTestByMark}`];
        }
        return [];
    }

    protected getNames(): string[] {
        if (this.config.selectTestByName) {
            return ["-k", `${this.config.selectTestByName}`];
        }
        return [];
    }

    protected getAdditionalOptions(): string {
        return this.config.additionalOptions || '';
    }

    protected getAllureDir(): string[] {
        return ["--alluredir", "report"];
    }

    protected getCleanAllResults(): string {
        return this.config.cleanOldResults ? "--clean-alluredir" : '';
    }

    protected getRealTimeLogs(): string {
        return this.config.realTimeLogs ? "--log-cli-level=INFO" : '';
    }

    protected getPdfConfig(): string {
        if (!this.config.pdfReport) {
            return '';
        }
        return "--generate-pdf " + new PdfArgumentBuilder().getCommand();
    }

    protected getVerbose(): string {
        return this.config.verbose ? "-v" : '';
    }

    getFlags(): string[] {
        return concat(
            "-u",
            "-m",
            "pytest",
            this.getTestScope(),
            ...this.getNames(),
            ...this.getMarks(),
            this.getAdditionalOptions(),
            ...this.getAllureDir(),
            this.getCleanAllResults(),
            this.getRealTimeLogs(),
            this.getPdfConfig(),
            this.getVerbose()
        );
    }

    getPythonPath(): string {
        return this.getInterpreterPath();
    }

    isCollectOnly(): boolean {
        return this.getAdditionalOptions().includes("--collect-only");
    }

    isQuiet(): boolean {
        return this.getAdditionalOptions().endsWith("--collect-only -q") || 
            this.getAdditionalOptions().includes("--collect-only -q ");
    }
}

export class CollectOnlyPytestArgumentBuilder extends PytestArgumentBuilder {
    constructor(protected readonly testScope?: string) {
        super(testScope);
    }

    getFlags(): string[] {
        return concat(
            "-u",
            "-m",
            "pytest",
            this.getTestScope(),
            "--collect-only",
            "-q"
        );
    }

    isCollectOnly(): boolean {
        return true;
    }

    isQuiet(): boolean {
        return true;
    }
}

function concat(...args: string[]): string[] {
    return args.filter(Boolean);
}