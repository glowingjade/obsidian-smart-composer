CREATE TABLE IF NOT EXISTS "vector_data_text_embedding_3_small" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"mtime" bigint NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vector_data_text_embedding_3_large" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"mtime" bigint NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(3072),
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddingIndex_text_embedding_3_small" ON "vector_data_text_embedding_3_small" USING hnsw ("embedding" vector_cosine_ops);