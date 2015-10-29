'use strict';

var browser = require('./browser');

// module.exports.loadFile = loadFile;


/**
 * Open a diagram file.
 *
 * @param {Function} callback
 */
function openFile(callback) {
  browser.send('file.open', callback);
}

module.exports.openFile = openFile;


/**
 * Close a diagram file.
 *
 * @param {Diagram} diagramFile
 * @param {Function} callback
 */
function closeFile(diagramFile, callback) {
  browser.send('file.close', [ diagramFile ], callback);
}

module.exports.closeFile = closeFile;


/**
 * Save a diagram file.
 *
 * @param  {Diagram}  diagramFile
 * @param  {Object}   options
 * @param  {Function} callback
 */
function saveFile(diagramFile, options, callback) {
  var diagram = {
    path: diagramFile.path,
    name: diagramFile.name,
    contents: diagramFile.contents
  };

  browser.send('file.save', [ options.create, diagram ], function(err, updatedDiagram) {
    if (err) {
      return callback(err);
    }

    diagramFile.name = updatedDiagram.name;
    diagramFile.path = updatedDiagram.path;

    callback(err, diagramFile);
  });
}

module.exports.saveFile = saveFile;

/**
 * Sends a list of unsaved diagrams so the user can have
 * the choice of saving them before quitting.
 *
 * @param {Array} diagrams
 * @param {Function} callback
 */
function quit(hasUnsavedChanges, callback) {
  if (!callback) {
    return browser.send('editor.quit', [ hasUnsavedChanges ], function() {});
  }

  browser.send('editor.quit', [ hasUnsavedChanges ], callback);
}

module.exports.quit = quit;
