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

// custom vector type for dynamic dimension
const customVector = customType<{ data: number[] }>({
  dataType() {
    return 'vector'
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
