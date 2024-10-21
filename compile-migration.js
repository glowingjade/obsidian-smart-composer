import { readMigrationFiles } from 'drizzle-orm/migrator'
import fs from 'node:fs/promises'

const migrations = readMigrationFiles({ migrationsFolder: './drizzle/' })

await fs.writeFile('./src/db/migrations.json', JSON.stringify(migrations))

console.log('Migrations compiled!')
