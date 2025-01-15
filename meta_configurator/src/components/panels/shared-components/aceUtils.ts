import type {Editor} from "brace";
import {watchImmediate} from "@vueuse/core";
import type {SettingsInterfaceRoot} from "@/settings/settingsTypes";

/**
 * change the mode depending on the data format.
 * to support new data formats, they need to be added here too.
 */
export function setupAceMode(editor: Editor, settings: SettingsInterfaceRoot) {
    watchImmediate(
        () => settings.dataFormat,
        format => {
            if (format == 'json') {
                editor.getSession().setMode('ace/mode/json');
            } else if (format == 'yaml') {
                editor.getSession().setMode('ace/mode/yaml');
            }
        }
    );
}

export function setupAceProperties(editor: Editor, settings: SettingsInterfaceRoot) {
    editor.$blockScrolling = Infinity;
    editor.setOptions({
        autoScrollEditorIntoView: true, // this is needed if editor is inside scrollable page
    });
    editor.setTheme('ace/theme/clouds');
    editor.setShowPrintMargin(false);
    editor.getSession().setTabSize(settings.codeEditor.tabSize);

    // it's not clear why timeout is needed here, but without it the
    // ace editor starts flashing and becomes unusable
    window.setTimeout(() => {
        watchImmediate(
            () => settings.codeEditor.fontSize,
            fontSize => {
                if (editor && fontSize && fontSize > 6 && fontSize < 65) {
                    editor.setFontSize(fontSize.toString() + 'px');
                }
            }
        );
    }, 0);
}