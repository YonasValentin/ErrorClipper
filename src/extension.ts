import * as vscode from 'vscode';
import * as l10n from '@vscode/l10n';

const MAX_CLICKS = 5;
const CONTRIBUTION_PROMPT_CLICKS = 25;

async function promptForReview(context: vscode.ExtensionContext) {
  const choice = await vscode.window.showInformationMessage(
    l10n.t('USED_ERROR_CLIPPER_FEW_TIMES_REVIEW'),
    l10n.t('YES'),
    l10n.t('ALREADY_LEFT_REVIEW'),
    l10n.t('LATER')
  );

  if (choice === l10n.t('YES')) {
    vscode.env.openExternal(
      vscode.Uri.parse(
        'https://marketplace.visualstudio.com/items?itemName=YonasValentinMougaardKristensen.errorclipper#review-details'
      )
    );
  } else if (choice === l10n.t('ALREADY_LEFT_REVIEW')) {
    context.globalState.update('errorclipper.hasLeftReview', true);
  }

  context.globalState.update('errorclipper.clickCount', 0); // Reset count
}

async function promptForContribution(context: vscode.ExtensionContext) {
  const choice = await vscode.window.showInformationMessage(
    l10n.t('USED_ERROR_CLIPPER_EXTENSIVELY_CONTRIBUTE'),
    l10n.t('YES_WANT_CONTRIBUTE'),
    l10n.t('ALREADY_CONTRIBUTED'),
    l10n.t('LATER')
  );

  if (choice === l10n.t('YES_WANT_CONTRIBUTE')) {
    vscode.env.openExternal(
      vscode.Uri.parse('https://www.buymeacoffee.com/YonasValentin')
    );
  } else if (choice === l10n.t('ALREADY_CONTRIBUTED')) {
    context.globalState.update('errorclipper.hasContributed', true);
  }

  context.globalState.update('errorclipper.contributionClickCount', 0); // Reset count
}

function incrementClickCount(context: vscode.ExtensionContext) {
  let clickCount = context.globalState.get<number>(
    'errorclipper.clickCount',
    0
  );
  let contributionClickCount = context.globalState.get<number>(
    'errorclipper.contributionClickCount',
    0
  );
  const hasLeftReview = context.globalState.get<boolean>(
    'errorclipper.hasLeftReview',
    false
  );
  const hasContributed = context.globalState.get<boolean>(
    'errorclipper.hasContributed',
    false
  );

  if (!hasLeftReview) {
    clickCount += 1;
    context.globalState.update('errorclipper.clickCount', clickCount);

    if (clickCount >= MAX_CLICKS) {
      promptForReview(context);
    }
  }

  if (!hasContributed) {
    contributionClickCount += 1;
    context.globalState.update(
      'errorclipper.contributionClickCount',
      contributionClickCount
    );

    if (contributionClickCount >= CONTRIBUTION_PROMPT_CLICKS) {
      promptForContribution(context);
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Load the translations for the current locale
  l10n.config({
    fsPath: context.asAbsolutePath(`i18n/${vscode.env.language}.json`),
  });

  const hasShownMessageKey = 'errorclipper.hasShownMessage';
  const hasShownMessage = context.globalState.get(hasShownMessageKey, false);

  if (!hasShownMessage) {
    vscode.window.showInformationMessage(
      l10n.t('CONGRATS_ERROR_CLIPPER_ACTIVE')
    );
    context.globalState.update(hasShownMessageKey, true);
  }

  // Register the hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider('*', {
      provideHover(document, position) {
        const editor = vscode.window.activeTextEditor;

        if (editor) {
          const wordRange = document.getWordRangeAtPosition(position);
          const hoverRange = wordRange || new vscode.Range(position, position);

          const diagnostics = vscode.languages.getDiagnostics(document.uri);
          const lineDiagnostics = diagnostics.filter((diagnostic) =>
            diagnostic.range.intersection(hoverRange)
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
              `[${l10n.t(
                'COPY_ERROR_MESSAGE_ONLY'
              )}]( ${copyCommandUri})\n\n[${l10n.t(
                'COPY_ERROR_MESSAGE_CODE_FULL_FILE'
              )}](${copyFullCommandUri})`
            );
            markdownString.isTrusted = true;

            return new vscode.Hover(markdownString, hoverRange);
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
        vscode.window.showInformationMessage(l10n.t('ERROR_MESSAGE_COPIED'));

        incrementClickCount(context);
      } else {
        vscode.window.showWarningMessage(l10n.t('NO_ERROR_MESSAGE_COPY'));
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
        const combinedText = `${l10n.t(
          'How do I fix this error?'
        )}: ${message}\n\n${l10n.t('This is the code')}:\n${fullText}`;
        vscode.env.clipboard.writeText(combinedText);
        vscode.window.showInformationMessage(
          l10n.t('ERROR_MESSAGE_CODE_FULL_FILE_COPIED')
        );

        incrementClickCount(context);
      } else {
        vscode.window.showWarningMessage(
          l10n.t('NO_ERROR_MESSAGE_FULL_FILE_COPY')
        );
      }
    })
  );
}

export function deactivate() {}
