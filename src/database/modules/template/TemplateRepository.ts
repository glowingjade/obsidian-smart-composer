import { eq } from 'drizzle-orm'
import { PgliteDatabase } from 'drizzle-orm/pglite'
import { App } from 'obsidian'

import { DatabaseNotInitializedException } from '../../exception'
import {
  type InsertTemplate,
  type SelectTemplate,
  templateTable,
} from '../../schema'

export class TemplateRepository {
  private app: App
  private db: PgliteDatabase | null

  constructor(app: App, db: PgliteDatabase | null) {
    this.app = app
    this.db = db
  }

  async create(template: InsertTemplate): Promise<SelectTemplate> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }

    const [created] = await this.db
      .insert(templateTable)
      .values(template)
      .returning()
    return created
  }

  async findAll(): Promise<SelectTemplate[]> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    return await this.db.select().from(templateTable)
  }

  async findByName(name: string): Promise<SelectTemplate | null> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const [template] = await this.db
      .select()
      .from(templateTable)
      .where(eq(templateTable.name, name))
    return template ?? null
  }

  async update(
    id: string,
    template: Partial<InsertTemplate>,
  ): Promise<SelectTemplate | null> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const [updated] = await this.db
      .update(templateTable)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(templateTable.id, id))
      .returning()
    return updated
  }

  async delete(id: string): Promise<boolean> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const [deleted] = await this.db
      .delete(templateTable)
      .where(eq(templateTable.id, id))
      .returning()
    return !!deleted
  }
}
