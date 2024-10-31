const { readMigrationFiles } = require('drizzle-orm/migrator')
const fs = require('node:fs/promises')

async function compileMigrations() {
  const migrations = readMigrationFiles({ migrationsFolder: './drizzle/' })

  await fs.writeFile(
    './src/database/migrations.json',
    JSON.stringify(migrations),
  )

  console.log('Migrations compiled!')
}

compileMigrations().catch(console.error)
