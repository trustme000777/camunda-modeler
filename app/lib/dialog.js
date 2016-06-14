'use strict';

var path = require('path');

var map = require('lodash/collection/map');

var filterExtensions = require('./util/filter-extensions'),
    ensureOptions = require('./util/ensure-opts');

/**
 * Interface for handling dialogs.
 *
 * @param  {Object} Options
 */
function Dialog(options) {
  ensureOptions([ 'dialog', 'config', 'userDesktopPath' ], options);

  this.dialog = options.dialog;
  this.config = options.config;

  this.userDesktopPath = options.userDesktopPath;
}

module.exports = Dialog;


Dialog.prototype.getDialogOptions = function(type, opts) {
  var config = this.config,
      userDesktopPath = this.userDesktopPath;

  var defaultPath = config.get('defaultPath', userDesktopPath);


  this._dialogs = {
    contentChanged: function() {
      return {
        title: 'File changed',
        message: 'The file has been changed externally.\nWould you like to reload it?',
        type: 'question',
        buttons: [
          { id: 'ok', label: 'Reload' },
          { id: 'cancel', label: 'Cancel' }
        ]
      };
    },
    open: function() {
      return {
        title: 'Open diagram',
        defaultPath: defaultPath,
        properties: [ 'openFile', 'multiSelections' ],
        filters: filterExtensions([ 'supported', 'bpmn', 'dmn', 'cmmn', 'all' ])
      };
    },
    save: function(options) {
      ensureOptions([ 'name', 'fileType' ], options);

      return {
        title: 'Save ' + options.name + ' as..',
        defaultPath: defaultPath + '/' + options.name,
        filters: filterExtensions([ options.fileType, 'all' ])
      };
    },
    close: function(options) {
      ensureOptions([ 'name' ], options);

      return {
        title: 'Close diagram',
        message: 'Save changes to ' + options.name + ' before closing?',
        type: 'question',
        buttons: [
          { id: 'cancel', label: 'Cancel' },
          { id: 'save', label: 'Save' },
          { id: 'discard', label: 'Don\'t Save' }
        ]
      };
    },
    importError: function(options) {
      ensureOptions([ 'name', 'errorDetails' ], options);

      return {
        type: 'error',
        title: 'Importing Error',
        buttons: [
          { id: 'cancel', label: 'Close' },
          { id: 'ask-forum', label: 'Ask in Forum' }
        ],
        message: 'Ooops, we could not display this diagram!',
        detail: [
          options.errorDetails,
          '',
          'Do you believe "' + options.name + '" is valid BPMN or DMN diagram?',
          '',
          'Post this error with your diagram in our forum for help.'
        ].join('\n')
      };
    },
    unrecognizedFile: function(options) {
      ensureOptions([ 'name' ], options);

      return {
        type: 'warning',
        title: 'Unrecognized file format',
        buttons: [
          { id: 'cancel', label: 'Close' }
        ],
        message: 'The file "' + options.name + '" is not a BPMN or DMN file.'
      };
    },
    existingFile: function(options) {
      ensureOptions([ 'name' ], options);

      return {
        type: 'warning',
        title: 'Existing file',
        buttons: [
          { id: 'cancel', label: 'Cancel' },
          { id: 'no-overwrite', label: 'No' },
          { id: 'overwrite', label: 'Overwrite' }
        ],
        message: 'The file "' + options.name + '" already exists. Do you want to overwrite it?'
      };
    },
    reimportWarning: function(options) {

      return {
        type: 'warning',
        title: 'Import warning',
        buttons: [
          { id: 'cancel', label: 'Cancel' },
          { id: 'switch', label: 'Switch' },
          { id: 'discard', label: 'Discard changes' }
        ],
        message: [
          'Your diagram\'s undo history will be lost due to xml changes.',
          '',
          'Do you want to proceed?'
        ].join('\n')
      };
    },
    namespace: function() {
      return {
        type: 'warning',
        title: 'Deprecated <activiti> namespace detected',
        buttons: [
          { id: 'cancel', label: 'Cancel' },
          { id: 'no', label: 'No' },
          { id: 'yes', label: 'Yes' }
        ],
        message: 'Would you like to convert your diagram to the <camunda> namespace?',
        detail: [
          'This will allow you to maintain execution related properties.',
          '',
          '<camunda> namespace support works from Camunda BPM versions 7.4.0, 7.3.3, 7.2.6 onwards.'
        ].join('\n')
      };
    },
    savingDenied: function(options) {
      return {
        type: 'warning',
        title: 'Cannot save file',
        buttons: [
          { id: 'cancel', label: 'Cancel' },
          { id: 'save-as', label: 'Save File as..' }
        ],
        message: [
          'We cannot save or overwrite the current file.',
          'Do you want to save the file as.. ?'
        ].join('\n')
      };
    }
  };

  return this._dialogs[type](opts);
};

Dialog.prototype.setDefaultPath = function(filenames) {
  var config = this.config,
      defaultPath,
      dirname;

  if (Array.isArray(filenames)) {
    defaultPath = filenames[0];
  } else {
    defaultPath = filenames;
  }

  if (this.defaultPath && this.defaultPath === defaultPath) {
    return this.defaultPath;
  }

  dirname = path.dirname(defaultPath);

  config.set('defaultPath', dirname);

  this.defaultPath = dirname;
};

Dialog.prototype.showDialog = function(type, opts) {
  var dialog = this.dialog,
      dialogOptions = this.getDialogOptions(type, opts),
      buttons = dialogOptions.buttons,
      result;

  // windows needs this property
  dialogOptions.noLink = true;

  if (dialogOptions.buttons) {
    dialogOptions.buttons = map(buttons, function(button) {
      return button.label;
    });
  }

  if (type === 'open') {
    result = dialog.showOpenDialog(dialogOptions);

  } else
  if (type === 'save') {
    result = dialog.showSaveDialog(dialogOptions);

  } else {
    result = dialog.showMessageBox(dialogOptions);

    // get the button ID according to the result
    result = buttons[result].id;
  }

  // save last used path to config
  if (result && (type === 'open' || type === 'save')) {
    this.setDefaultPath(result);
  }

  return result;
};


Dialog.prototype.showGeneralErrorDialog = function() {
  var dialog = this.dialog;

  dialog.showErrorBox('Error', 'There was an internal error.' + '\n' + 'Please try again.');
};
