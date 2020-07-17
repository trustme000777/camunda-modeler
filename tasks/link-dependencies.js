/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

const fs = require('fs');
const { shellSync: exec } = require('execa');
const { sync: del } = require('del');
const path = require('path');

const customLinkersMap = {
  'bpmn-io/bpmn-js': linkBpmnJs,
  'bpmn-io/dmn-js': linkDmnJs
};

const clientDir = path.join(__dirname, '..', 'client');
const dependenciesDir = path.join(__dirname, '.linked-dependencies');

const dependencies = getDependencies();
linkDependencies(dependencies);

/**
 * @typedef Dependency
 * @property {string} repo
 * @property {string} ref - branch or tag or commit
 */


/**
 * Parse and return dependencies stored in LINKED_DEPENDENCIES environment variable.
 * It expects that dependencies are passed in form of:
 * `LINKED_DEPENDENCIES=bpmn-io/dmn-js#master,bpmn-io/bpmn-js#develop`
 *
 * @returns {Dependency[]>}
 */
function getDependencies() {
  const rawDependencies = process.env.LINKED_DEPENDENCIES || '';
  const dependenciesList = rawDependencies.split(',').filter(Boolean);

  return dependenciesList.map(dependency => {
    const [ repo, ref ] = dependency.split('#');

    return { repo, ref };
  });
}

/**
 * Link client dependencies from specified repo and reference.
 *
 * @param {Dependency[]} dependencies
 */
async function linkDependencies(dependencies) {
  if (!dependencies.length) {
    console.log('No dependencies to link detected, exiting.');
    return;
  }

  del(dependenciesDir);
  fs.mkdirSync(dependenciesDir);

  for (const dependency of dependencies) {
    const link = customLinkersMap[dependency.repo] || linkFromGitHub;
    const dependencyName = `${dependency.repo}#${dependency.ref}`;

    console.log(`Linking ${dependencyName}...`);
    try {
      await link(dependency);
      console.log(`Linked ${dependencyName}.`);
    } catch (error) {
      console.error(`Unable to link ${dependencyName} due to error:`, error);
      console.log('Exiting.');
      process.exit(1);
    }
  }
}

/**
 *
 * @param {Dependency} dependency
 */
function linkFromGitHub({ repo, ref }) {
  exec(`npm i ${repo}#${ref}`, { cwd: clientDir });
}

/**
 *
 * @param {Dependency} dependency
 */
function linkDmnJs({ repo, ref }) {
  gitClone(repo);
  console.log(`Cloned ${repo}.`);

  const rootDir = path.join(dependenciesDir, 'dmn-js');
  exec(`git checkout ${ref}`, { cwd: rootDir });
  console.log(`Checked out ${ref}.`);

  exec('npm ci', { cwd: rootDir });
  console.log('Installed dependencies.');

  exec('npm run build-distro', { cwd: rootDir });
  console.log('Built distro.');

  const dmnJsDir = path.join(rootDir, 'packages', 'dmn-js');
  exec('yarn link', { cwd: dmnJsDir });

  exec('yarn link dmn-js', { cwd: clientDir });
}

/**
 *
 * @param {Dependency} dependency
 */
function linkBpmnJs({ repo, ref }) {
  gitClone(repo);
  console.log(`Cloned ${repo}.`);

  const rootDir = path.join(dependenciesDir, 'bpmn-js');
  exec(`git checkout ${ref}`, { cwd: rootDir });
  console.log(`Checked out ${ref}.`);

  exec('npm ci', { cwd: rootDir });
  console.log('Installed dependencies.');

  exec('npm run distro', { cwd: rootDir });
  console.log('Built distro.');

  exec('yarn link', { cwd: rootDir });

  exec('yarn link bpmn-js', { cwd: clientDir });
}

function gitClone(repo) {
  const repoUrl = getRepoUrl(repo);

  exec(`git clone ${repoUrl}`, { cwd: dependenciesDir });
}

function getRepoUrl(repo) {
  return `https://github.com/${repo}.git`;
}
