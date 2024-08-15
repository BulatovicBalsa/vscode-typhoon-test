import * as vscode from 'vscode';

export function createWebviewPanel(): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
        'testStatus', // Identifies the type of the webview. Used internally
        'Test Status', // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in
        {
            enableScripts: true, // Enable JavaScript in the WebView
        }
    );

    // Set the initial HTML content
    panel.webview.html = getWebviewContent();

    return panel;
}

function getWebviewContent(): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Status</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background-color: #f3f3f3;
                }
                #status {
                    font-size: 24px;
                    font-weight: bold;
                    color: #333;
                }
            </style>
        </head>
        <body>
            <div id="status">Awaiting Test Results...</div>
            <script>
                const vscode = acquireVsCodeApi();

                window.addEventListener('message', event => {
                    const message = event.data; // The JSON data that the extension sent
                    if (message.command === 'updateStatus') {
                        document.getElementById('status').innerText = message.status;
                    }
                });
            </script>
        </body>
        </html>
    `;
}
