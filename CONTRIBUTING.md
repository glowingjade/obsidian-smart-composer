# Contributing to Obsidian Smart Composer

We welcome contributions to Obsidian Smart Composer! This document will guide you through the process of contributing to the project.

## Development Workflow

1. Clone the repository to your Obsidian vault's plugins directory:

   ```
   git clone https://github.com/glowingjade/obsidian-smart-composer.git /path/to/your/vault/.obsidian/plugins/obsidian-smart-composer
   ```

2. Navigate to the plugin directory:

   ```
   cd /path/to/your/vault/.obsidian/plugins/obsidian-smart-composer
   ```

3. Run the following commands to install dependencies and start the development server:

   ```
   npm install
   npm run dev
   ```

4. Start making changes to the plugin code. To test your changes:

   - Reload Obsidian manually, or
   - Use the [Hot Reload plugin](https://github.com/pjeby/hot-reload) for automatic reloading during development

5. To check if everything is building correctly, set the `logLevel: debug` in `esbuild.config.mjs`. This will provide more detailed output during the build process, helping you identify any issues.

## Database Development

We use PGlite and Drizzle ORM for database management in this project. This section will guide you through working with the database schema and making changes.

### Libraries

1. **PGlite**: A lightweight PostgreSQL implementation that runs in various JavaScript environments, allowing use of PostgreSQL syntax without a full database server. [Learn more](https://pglite.dev/docs/)

2. **Drizzle ORM**: A TypeScript ORM providing type-safe database interactions with a SQL-like query API, supporting multiple database dialects. [Learn more](https://orm.drizzle.team/docs/overview)

### Updating the Database Schema

To update the database schema:

1. Modify the existing schema as needed in the `src/database/schema.ts` file.
2. After making changes, run the following command to generate migration files:

   ```
   npx drizzle-kit generate --name <migration-name>
   ```

3. Review the generated migration files in the `drizzle` directory.
4. Compile the migration files into a single JSON file by running:

   ```
   npm run migrate:compile
   ```

   This will create or update the `src/database/migrations.json` file. Note that migration files in the 'drizzle' directory won't affect the project until they are compiled into this JSON file, which is used in the actual migration process.

### Handling Migration Files

We recommend creating a single migration file for each change. To squash multiple changes into a single migration file after finalizing your schema.ts:

1. Delete the newly created migration files in the `drizzle` directory.
2. Delete the new snapshot.json files in the `drizzle/meta` directory.
3. Remove new entries in `drizzle/meta/_journal.json`.
4. Run the migration generation command again to create a final, consolidated migration file:

   ```
   npx drizzle-kit generate --name <migration-name>
   ```

This process ensures a clean and organized migration history.

### Debugging Database Issues

When debugging database-related issues in Obsidian's developer console, you can use the "Store as global variable" feature to interact with the database directly:

1. Look for the console message "Smart composer database initialized." 
2. Right-click on this DatabaseManager object and select "Store as global variable" (it will be stored as `tempN`)
3. You can then run SQL queries directly using the stored variable. For example:

   ```javascript
   await temp1.pgClient.query(`
     SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
       AND table_type = 'BASE TABLE'
     ORDER BY table_schema, table_name;
   `);
   ```
4. should call `await temp1.save()` to save the database to disk

This method allows you to inspect database tables, run queries, and debug database-related issues directly in the console.

## Sending a Pull Request

Before starting work on a significant change, please first discuss the proposed changes by either:
1. Opening a new issue
2. Starting a discussion in GitHub Discussions

This helps avoid duplicate work and ensures your contribution aligns with the project's direction.

The core team is monitoring for pull requests. We will review your pull request and either merge it, request changes to it, or close it with an explanation.

**Before submitting a pull request**, please make sure the following is done:

1. Fork the repository and create your branch from `main`.
2. Run `npm install` in the repository root.
3. If you've fixed a bug or added code that should be tested, add tests!
4. Ensure the test suite passes (`npm test`).
5. Check for type errors (`npm run type:check`).
6. Check for linting errors (`npm run lint:check`).
7. You can fix linting errors automatically with `npm run lint:fix`.

## Development Issues and Solutions

For common development issues, their solutions, and other helpful information for contributors, please refer to the following resources:

1. [DEVELOPMENT.md](./DEVELOPMENT.md): Contains detailed information about the development process, common issues, and their solutions.
2. [Issue Tracker](https://github.com/glowingjade/obsidian-smart-composer/issues): Check our issue tracker for detailed problem descriptions and solutions.
3. [GitHub Discussions](https://github.com/glowingjade/obsidian-smart-composer/discussions): Join our community discussions for interactive problem-solving and knowledge sharing.

We encourage contributors to review these resources before starting development and to help keep them updated with new findings.

### Known Issue: Memory Leak During Plugin Reloading

A memory leak has been identified when reloading the plugin. This may not be critical for end-users who typically don't reload the plugin frequently, but it can become problematic for developers who reload often during the development process. If you experience Obsidian becoming unresponsive or slow after reloading the plugin multiple times, it may be due to this memory leak. We are actively investigating the root cause and working on potential fixes. Any reports or fixes in this area are appreciated.

## License

This project is licensed under the [MIT License](LICENSE). By contributing to this project, you agree that your contributions will be licensed under the MIT License. Please make sure you understand and comply with the terms of this license before submitting any contributions.

## Deployment (Maintainers Only)

For maintainers with repository write access, deployments are handled through git tags. To deploy a new version:

1. Create and push a new tag: `git tag <version-number> && git push origin <version-number>`

Github workflow will automatically build, release and create a pull request to bump versions in versions.json, manifest.json and package.json. The pull request needs to be manually reviewed and merged by a maintainer.
