import { sql } from 'drizzle-orm'
import {
  bigint,
  customType,
  index,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { SerializedLexicalNode } from 'lexical'
import { z } from 'zod'

// custom vector type for dynamic dimension
const customVector = customType<{ data: number[] }>({
  dataType() {
    return 'vector'
  },
  toDriver(value) {
    return JSON.stringify(value)
  },
  fromDriver(value) {
    if (typeof value !== 'string') {
      throw new Error('Invalid vector value from pg driver')
    }
    const parsed = z.array(z.number()).parse(JSON.parse(value))
    return parsed
  },
})

export type VectorMetaData = {
  startLine: number
  endLine: number
}

// important: dimensions must be less than 2000!
const supportedDimensionsForIndex = [768, 1024, 1536]

export const embeddingTable = pgTable(
  'embeddings',
  {
    id: serial('id').primaryKey(),
    path: text('path').notNull(), // path to the file
    mtime: bigint('mtime', { mode: 'number' }).notNull(), // mtime of the file
    content: text('content').notNull(), // content of the file
    model: text('model').notNull(), // model id
    dimensions: smallint('dimensions').notNull(), // dimensions of the vector
    embedding: customVector('embedding'), // embedding of the file
    metadata: jsonb('metadata').notNull().$type<VectorMetaData>(),
  },
  (table) => [
    index('embeddings_path_index').on(table.path),
    index('embeddings_model_index').on(table.model),
    index('embeddings_dimensions_index').on(table.dimensions),
    ...supportedDimensionsForIndex.map((dimension) =>
      // https://github.com/pgvector/pgvector?tab=readme-ov-file#can-i-store-vectors-with-different-dimensions-in-the-same-column
      index(`embeddings_embedding_${dimension}_index`)
        .using(
          'hnsw',
          sql.raw(
            `(${table.embedding.name}::vector(${dimension})) vector_cosine_ops`,
          ),
        )
        .where(sql.raw(`${table.dimensions.name} = ${dimension}`)),
    ),
  ],
)

export type SelectEmbedding = typeof embeddingTable.$inferSelect
export type InsertEmbedding = typeof embeddingTable.$inferInsert

/* Template Table */
export type TemplateContent = {
  nodes: SerializedLexicalNode[]
}

export const templateTable = pgTable('template', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  content: jsonb('content').notNull().$type<TemplateContent>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type SelectTemplate = typeof templateTable.$inferSelect
export type InsertTemplate = typeof templateTable.$inferInsert
