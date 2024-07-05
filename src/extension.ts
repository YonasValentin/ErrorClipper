import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Register a command to activate the extension
  const activateCommand = vscode.commands.registerCommand(
    'errorclipper.activate',
    () => {
      vscode.window.showInformationMessage(
        'Congrats, ErrorClipper is now active - happy clipping!'
      );

      // Register the hover provider
      context.subscriptions.push(
        vscode.languages.registerHoverProvider('*', {
          provideHover(document, position, token) {
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
                const markdownString = new vscode.MarkdownString(
                  `[Copy error to clipboard](${copyCommandUri})`
                );
                markdownString.isTrusted = true;

                return new vscode.Hover(markdownString, range);
              }
            }
            return null;
          },
        })
      );
    }
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

  context.subscriptions.push(activateCommand);
}

export function deactivate() {}
