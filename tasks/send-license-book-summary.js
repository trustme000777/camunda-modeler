/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

'use strict';

const fs = require('fs');

const exec = require('execa').sync;

const nodemailer = require('nodemailer');

const { Diff2Html: diff2html } = require('diff2html');


const {
  collectClientDependencies,
  collectLicenses,
  generateSummary,
  processLicenses
} = require('./license-book-handlers');

sendSummary().then(
  () => console.log('Done.'),
  (err) => {
    console.error(err);

    process.exit(1);
  }
);

async function sendSummary() {
  const { previousVersion, currentVersion } = getVersions();

  console.log(`Generating summary for version ${currentVersion}`);

  console.log('Generating license book summary...');

  const summary = await getSummary();

  console.log('Generating changes summary...');

  const changesSummary = getChangesSummary({
    previousVersion,
    file: 'THIRD_PARTY_NOTICES'
  });

  const draftEmail = getDraftEmail(summary, currentVersion, changesSummary);

  console.log('Sending email...');

  await sendEmail(draftEmail);
}

function getVersions() {
  const currentVersion = exec('git', [
    'describe',
    '--abbrev=0'
  ]).stdout;

  const previousVersion = exec('git', [
    'describe',
    '--abbrev=0',
    `${currentVersion}^`
  ]).stdout;

  return {
    currentVersion,
    previousVersion
  };
}

async function getSummary() {
  const clientDependencies = collectClientDependencies();

  const combinedLicenses = await collectLicenses(
    { name: 'app' },
    { name: 'client', filter: name => clientDependencies[name] }
  );

  const {
    processedLicenses
  } = processLicenses(combinedLicenses);

  return generateSummary(processedLicenses);
}

function getChangesSummary({ previousVersion, file }) {
  try {
    const diff = getDiff({ previousVersion, file });

    const html = getHtmlFromDiff(diff);

    console.log('Changes summary generated');

    return html;
  } catch (error) {
    console.log('Changes summary could not be generated, error: %O', error);

    return null;
  }
}

function getDiff({ previousVersion, file }) {
  const previousFile = exec('git', ['show', `${previousVersion}:${file}`]).stdout;

  // diff exits with <1> if a diff exists; we must account for that special behavior
  // cf. https://github.com/nodejs/node/issues/19494#issuecomment-374721063
  try {
    return exec('diff', ['-u', '-', file], { input: previousFile }).stdout;
  } catch (e) {

    if (e.code !== 1) {
      throw e;
    }

    return e.stdout;
  }
}

function getHtmlFromDiff(diff) {
  const style = fs.readFileSync(require.resolve('diff2html/dist/diff2html.min.css'));

  const diffHtml = diff2html.getPrettyHtml(diff, { inputFormat: 'diff', showFiles: true, matching: 'lines', outputFormat: 'side-by-side' });

  const html = `
<!-- Generated by tasks/send-summary.js; do not edit. -->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Camunda Modeler Third Party Notices Changes</title>
<style>${style}</style>
</head>
<body>
  <h1>
    Camunda Modeler Third Party Notices Changes
  </h1>
${diffHtml}
</body>
</html>
  `;

  return html;
}

function getDraftEmail(summary, currentVersion, changesSummary) {
  const subject = `Camunda Modeler ${currentVersion} Third Party Summary`;
  const text = getMessageText(summary, currentVersion, changesSummary);
  const attachment = changesSummary;

  return {
    subject,
    text,
    attachment
  };
}

function getMessageText(summary, version, changesSummary) {
  let message = `${summary}

Third party notices: https://github.com/camunda/camunda-modeler/blob/${version}/THIRD_PARTY_NOTICES
  `;

  if (changesSummary) {
    message += '\nChanges since last version can be found in the attachment.';
  }

  return message;
}

function sendEmail({ subject, text, attachment }) {

  const {
    EMAIL_TO: to,
    EMAIL_HOST: host,
    EMAIL_USERNAME: username,
    EMAIL_PASSWORD: password
  } = process.env;

  const transport = nodemailer.createTransport({
    host,
    secure: true,
    auth: {
      user: username,
      pass: password
    }
  });

  const message = {
    to,
    subject,
    text
  };

  if (attachment) {
    message.attachments = [
      {
        filename: 'changes_summary.html',
        content: attachment
      }
    ];
  }

  return transport.sendMail(message);
}
