import {
  bigint,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  vector,
} from 'drizzle-orm/pg-core'

import { EMBEDDING_MODEL_OPTIONS } from '../constants'
import { EmbeddingModelName } from '../types/embedding'

const createVectorTable = (name: string, dimension: number) => {
  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_')
  return pgTable(
    `vector_data_${sanitizedName}`,
    {
      id: serial('id').primaryKey(),
      path: text('path').notNull(),
      mtime: bigint('mtime', { mode: 'number' }).notNull(),
      content: text('content').notNull(),
      embedding: vector('embedding', { dimensions: dimension }),
      metadata: jsonb('metadata').notNull().$type<VectorMetaData>(),
    },
    dimension <= 2000 // pgvector only supports hnsw for dimensions <= 2000
      ? (table) => ({
          embeddingIndex: index(`embeddingIndex_${sanitizedName}`).using(
            'hnsw',
            table.embedding.op('vector_cosine_ops'),
          ),
        })
      : undefined,
  )
}

export const vectorTables = EMBEDDING_MODEL_OPTIONS.reduce<
  Record<string, ReturnType<typeof createVectorTable>>
>((acc, modelOption) => {
  acc[modelOption.value] = createVectorTable(
    modelOption.value,
    modelOption.dimension,
  )
  return acc
}, {})

export type VectorTable<M extends EmbeddingModelName> = (typeof vectorTables)[M]
export type SelectVector = VectorTable<EmbeddingModelName>['$inferSelect']
export type InsertVector = VectorTable<EmbeddingModelName>['$inferInsert']
export type VectorMetaData = {
  startLine: number
  endLine: number
}

// 'npx drizzle-kit generate' requires individual table exports to generate correct migration files
export const vectorTable0 = vectorTables[EMBEDDING_MODEL_OPTIONS[0].value]
export const vectorTable1 = vectorTables[EMBEDDING_MODEL_OPTIONS[1].value]
export const vectorTable2 = vectorTables[EMBEDDING_MODEL_OPTIONS[2].value]
export const vectorTable3 = vectorTables[EMBEDDING_MODEL_OPTIONS[3].value]
