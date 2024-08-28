import { Platform } from '../../models/Platform';

export class LinuxPlatform implements Platform {
    getPythonCommand(): string {
        return 'python3';
    }

    getEmbeddedPythonCommand(): string {
        return 'typhoon-python';
    }

    getPythonExecutableExtension(): string {
        return '';
    }
}
