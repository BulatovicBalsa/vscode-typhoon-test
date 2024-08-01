import * as vscode from 'vscode';
import {TreeNode} from "../models/TreeNode";
import {PythonEntityType} from "../models/api-call-models";
import {loadPythonEntity} from "../utils/python-converter";

export class TreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | void> = new vscode.EventEmitter<TreeNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | void> = this._onDidChangeTreeData.event;

    private rootNodes: TreeNode[] = [];

    constructor() {
    }

    async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
        if (element.type === 'class') {
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

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    public async addModule(moduleName: string, type: PythonEntityType, alias: string): Promise<void> {
        try {
            const entity = await loadPythonEntity(moduleName, type);
            const node =  TreeNode.parsePythonEntity(entity, alias);
            this.rootNodes.push(node);
            this.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading module: ${error}`);
        }
    }

    doesAliasExist(alias: string): boolean {
        return this.rootNodes.some(node => node.alias === alias);
    }

    public getRootNodes(): TreeNode[] {
        return this.rootNodes;
    }
}

