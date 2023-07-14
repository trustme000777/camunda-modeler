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

const mri = require('mri');

const {
  collectLicenses,
  generateSummary,
  processLicenses
} = require('./license-book-handlers');

const CURRENT_VERSION = 'v' + require('../app/package.json').version;

const {
  help,
  ...args
} = mri(process.argv, {
  alias: {
    send: [ 's' ],
    file: [ 'f' ],
    print: [ 'p' ],
    output: [ 'o' ],
    help: [ 'h' ]
  },
  default: {
    send: false,
    file: 'THIRD_PARTY_NOTICES',
    print: false,
    output: false,
    help: false
  }
});


if (help) {
  console.log(`usage: node tasks/send-license-book-summary.js [-s] [-f=FILE_NAME] [-p] [-o=FILE_NAME]

Generate and/or send license book summary.
To send email, configure following env variables:
- EMAIL_TO,
- EMAIL_REPLY_TO,
- EMAIL_HOST,
- EMAIL_USERNAME,
- EMAIL_PASSWORD

Options:
  -s, --send                    send email
  -f, --file=FILE_NAME          file to diff; defaults to THIRD_PARTY_NOTICES
  -p, --print                   print email draft to stdout
  -o, --output=FILE_NAME        save changes summary to FILE_NAME

  -h, --help                    print this help
`);

  process.exit(0);
}

sendSummary(args).then(
  () => console.log('Done.'),
  (err) => {
    console.error(err);

    process.exit(1);
  }
);

async function sendSummary(args) {

  const {
    send,
    file,
    print,
    output
  } = args;

  const previousVersion = getPreviousVersion();

  console.log(`Generating summary for version ${CURRENT_VERSION}`);

  console.log('Generating license book summary...');

  const summary = await getSummary();

  console.log('Generating changes summary...');

  const changesSummary = getChangesSummary({
    previousVersion,
    file
  });

  const draftEmail = getDraftEmail(summary, changesSummary);

  if (print) {
    console.log(`Draft email:
${draftEmail.subject}
${draftEmail.text}
    `);
  }

  if (output && changesSummary) {
    console.log(`Saving changes summary to ${output}`);

    fs.writeFileSync(output, changesSummary);

    console.log('Saved.');
  }

  if (send) {
    console.log('Sending email...');

    await sendEmail(draftEmail);
  }
}

function getPreviousVersion() {
  const previousVersion = exec('git', [
    'describe',
    '--abbrev=0',
    `${CURRENT_VERSION}^`
  ]).stdout;

  return previousVersion;
}

async function getSummary() {
  const combinedLicenses = await collectLicenses();

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
  const previousFile = exec('git', [ 'show', `${previousVersion}:${file}` ]).stdout;

  // diff exits with <1> if a diff exists; we must account for that special behavior
  // cf. https://github.com/nodejs/node/issues/19494#issuecomment-374721063
  try {
    return exec('diff', [ '-u', '-', file ], { input: previousFile }).stdout;
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
<!-- Generated by tasks/send-license-book-summary.js; do not edit. -->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Camunda Modeler ${CURRENT_VERSION} Third Party Notices Changes Summary</title>
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

function getDraftEmail(summary, changesSummary) {
  const subject = `Camunda Modeler ${CURRENT_VERSION} Third Party Summary`;
  const text = getMessageText(summary, changesSummary);
  const attachment = changesSummary;

  return {
    subject,
    text,
    attachment
  };
}

function getMessageText(summary, changesSummary) {
  let message = `${summary}

Third party notices: https://github.com/camunda/camunda-modeler/blob/${CURRENT_VERSION}/THIRD_PARTY_NOTICES
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
    EMAIL_PASSWORD: password,
    EMAIL_REPLY_TO: replyTo
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
    replyTo,
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
