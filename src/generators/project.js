import '../features/bootstrap.js';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'node:child_process';
import { Listr } from 'listr2';
import { logger } from '../utils/logger.js';
import { formatFsError } from '../utils/fsError.js';
import { createDirectoryStructure } from './structure.js';
import { writeProjectFiles } from './files.js';

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 */
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', (err) => {
      reject(
        new Error(
          formatFsError(err, `Could not run ${command}`),
        ),
      );
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} exited with code ${code}. Fix issues above or run without that step.`,
          ),
        );
    });
  });
}

/**
 * @param {import('../config/userConfig.js').UserConfig} config
 */
export async function generateProject(config) {
  const targetRoot = path.resolve(process.cwd(), config.projectName);

  const tasks = new Listr(
    [
      {
        title: 'Validate target directory',
        task: async () => {
          try {
            if (await fs.pathExists(targetRoot)) {
              const st = await fs.stat(targetRoot);
              if (!st.isDirectory()) {
                throw new Error(
                  `"${config.projectName}" exists and is not a directory.`,
                );
              }
              const inner = await fs.readdir(targetRoot);
              if (inner.length > 0) {
                throw new Error(
                  `Folder "${config.projectName}" already exists and is not empty.`,
                );
              }
            }
          } catch (err) {
            if (
              err instanceof Error &&
              (err.message.includes('is not a directory') ||
                err.message.includes('not empty'))
            ) {
              throw err;
            }
            throw new Error(formatFsError(err, 'Could not read target path'));
          }
        },
      },
      {
        title: 'Create folder structure',
        task: async (ctx) => {
          try {
            ctx.plan = await createDirectoryStructure(targetRoot, config);
          } catch (err) {
            throw new Error(formatFsError(err, 'Create folders'));
          }
        },
      },
      {
        title: 'Write project files',
        task: async () => {
          try {
            await writeProjectFiles(targetRoot, config);
          } catch (err) {
            throw new Error(formatFsError(err, 'Write files'));
          }
        },
      },
      {
        title: 'Initialize Git repository',
        task: async (_ctx, task) => {
          if (!config.extras.git) {
            task.skip('Not selected');
            return;
          }
          await runCommand('git', ['init'], targetRoot);
        },
      },
      {
        title: 'Install dependencies',
        task: async (_ctx, task) => {
          if (!config.extras.installDeps) {
            task.skip('Not selected');
            return;
          }
          await runCommand('npm', ['install'], targetRoot);
        },
      },
    ],
    {
      concurrent: false,
      rendererOptions: { collapseSubtasks: false },
    },
  );

  await tasks.run();
  const rel = path.relative(process.cwd(), targetRoot);
  logger.info(`Created ${rel || config.projectName}`);
}
