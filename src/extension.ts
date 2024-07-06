import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage(
    'Congrats, ErrorClipper is now active - happy clipping!'
  );

  // Register the hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider('*', {
      provideHover(document, position) {
        const editor = vscode.window.activeTextEditor;

        if (editor) {
          const range = document.getWordRangeAtPosition(position);
          if (!range) {
            return null;
          }

          const diagnostics = vscode.languages.getDiagnostics(document.uri);
          const lineDiagnostics = diagnostics.filter((diagnostic) =>
            diagnostic.range.contains(position)
          );

          if (lineDiagnostics.length > 0) {
            const message = lineDiagnostics[0].message;
            const copyCommandUri = vscode.Uri.parse(
              `command:errorclipper.copyErrorMessage?${encodeURIComponent(
                JSON.stringify({ message })
              )}`
            );
            const copyFullCommandUri = vscode.Uri.parse(
              `command:errorclipper.copyErrorAndCode?${encodeURIComponent(
                JSON.stringify({ message })
              )}`
            );
            const markdownString = new vscode.MarkdownString(
              `[Copy error to clipboard](${copyCommandUri})\n\n[Copy error and code](${copyFullCommandUri})`
            );
            markdownString.isTrusted = true;

            return new vscode.Hover(markdownString, range);
          }
        }
        return null;
      },
    })
  );

  // Register the command to copy the error message
  context.subscriptions.push(
    vscode.commands.registerCommand('errorclipper.copyErrorMessage', (args) => {
      if (args && args.message) {
        const { message } = args;
        vscode.env.clipboard.writeText(message);
        vscode.window.showInformationMessage(
          'Error message copied to clipboard'
        );
      } else {
        vscode.window.showWarningMessage('No error message to copy.');
      }
    })
  );

  // Register the command to copy the error message and the full code
  context.subscriptions.push(
    vscode.commands.registerCommand('errorclipper.copyErrorAndCode', (args) => {
      const editor = vscode.window.activeTextEditor;
      if (args && args.message && editor) {
        const { message } = args;
        const fullText = editor.document.getText();
        const combinedText = `Error: ${message}\n\nCode:\n${fullText}`;
        vscode.env.clipboard.writeText(combinedText);
        vscode.window.showInformationMessage(
          'Error message and code copied to clipboard'
        );
      } else {
        vscode.window.showWarningMessage('No error message or code to copy.');
      }
    })
  );
}

export function deactivate() {}
