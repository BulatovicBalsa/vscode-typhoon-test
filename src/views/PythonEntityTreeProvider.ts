import * as vscode from 'vscode';
import { TreeNode } from "../models/TreeNode";
import { isPythonEntityType, PythonImport } from "../models/pythonEntity";
import { loadPythonEntity } from "../utils/pythonConverter";
import { getPythonInterpreterCommandOptions, loadWorkspaceElements } from "../utils/config";

export class PythonEntityTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    static instance: PythonEntityTreeProvider | undefined;
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | void> = new vscode.EventEmitter<TreeNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | void> = this._onDidChangeTreeData.event;
    private rootNodes: TreeNode[] = [];

    private constructor() {
        this.loadEntitiesFromWorkspace().then();
    }

    static getInstance(): PythonEntityTreeProvider {
        if (!PythonEntityTreeProvider.instance) {
            PythonEntityTreeProvider.instance = new PythonEntityTreeProvider();
        }
        return PythonEntityTreeProvider.instance;
    }

    async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
        if (isPythonEntityType(element.item.type)) {
            return element;
        }

        element.command = {
            command: 'typhoon-test.handleTreeViewItemClicked',
            title: 'Show Docstring',
            arguments: [element]
        };

        return element;
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (!element) {
            return this.rootNodes;
        } else {
            return element.children;
        }
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    public async addEntity(pythonImport: PythonImport): Promise<void> {
        const pythonCommands = getPythonInterpreterCommandOptions();
        for (let i = 0; i < pythonCommands.length; i++) {
            const command = pythonCommands[i];
            try {
                const entity = await loadPythonEntity(command, pythonImport.name, pythonImport.type);
                if ("error" in entity) {
                    throw entity.error;
                }
                const node = TreeNode.parsePythonEntity(entity, pythonImport.alias);
                this.rootNodes.push(node);
                this.refresh();
                break;
            } catch (error) {
                if (i === pythonCommands.length - 1) {
                    vscode.window.showErrorMessage(`Failed to load ${pythonImport.type} ${pythonImport.name}: ${error}`);
                }
            }
        }
    }

    public doesAliasExist(alias: string): boolean {
        return this.rootNodes.some(node => node.alias === alias);
    }

    public getRootNodesAsPythonImports(): PythonImport[] {
        return this.rootNodes.map(root => root.toPythonImport());
    }

    public async loadEntitiesFromWorkspace() {
        loadWorkspaceElements().forEach(element =>
            this.doesAliasExist(element.alias) || this.addEntity(element)
        );
    }

    public async removeEntity(item: TreeNode): Promise<void> {
        const index = this.rootNodes.indexOf(item);
        if (index !== -1) {
            this.rootNodes.splice(index, 1);
            this.refresh();
        }
    }
}

export function getPythonEntityTreeProvider(): PythonEntityTreeProvider {
    return PythonEntityTreeProvider.getInstance();
}