import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { CommanderError, program } from 'commander';
import '../features/bootstrap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readPackageMeta() {
  try {
    const raw = readFileSync(
      join(__dirname, '..', '..', 'package.json'),
      'utf8',
    );
    return JSON.parse(raw);
  } catch {
    return { version: '0.0.0' };
  }
}

const pkg = readPackageMeta();

function handleError(err) {
  if (err instanceof CommanderError) {
    process.exitCode = err.exitCode ?? 1;
    return;
  }
  if (err instanceof Error && err.name === 'UserCancelledError') {
    const msg = err.message?.trim();
    if (msg && msg !== 'Setup cancelled.') {
      console.log(chalk.yellow(msg));
    }
    console.log(chalk.dim('Cancelled.'));
    process.exitCode = 0;
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  console.error(chalk.red(message));
  process.exitCode = 1;
}

/**
 * @param {() => Promise<void>} fn
 */
async function safeRun(fn) {
  try {
    await fn();
  } catch (err) {
    handleError(err);
  }
}

export async function runProgram() {
  program
    .name('tejasetup')
    .description('Interactive project system generator')
    .version(pkg.version);

  program
    .command('init')
    .description('Create a new project (interactive)')
    .action(() =>
      safeRun(async () => {
        const { runInitCommand } = await import('./commands/init.js');
        await runInitCommand();
      }),
    );

  program
    .command('add')
    .description('Add a feature to an existing tejasetup project')
    .argument('<feature>', 'Feature id (auth, database, logging)')
    .option(
      '-C, --chdir <path>',
      'Project directory',
      process.cwd(),
    )
    .action((feature, opts) =>
      safeRun(async () => {
        const { runAddCommand } = await import('./commands/add.js');
        await runAddCommand(feature, opts);
      }),
    );

  program
    .command('doctor')
    .description('Check environment and project manifest')
    .option(
      '-C, --chdir <path>',
      'Project directory',
      process.cwd(),
    )
    .action((opts) =>
      safeRun(async () => {
        const { runDoctorCommand } = await import('./commands/doctor.js');
        await runDoctorCommand(opts);
      }),
    );

  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    await safeRun(async () => {
      const { runInitCommand } = await import('./commands/init.js');
      await runInitCommand();
    });
    return;
  }

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    handleError(err);
  }
}
