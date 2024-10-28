CREATE TABLE IF NOT EXISTS "vector_data_nomic_embed_text" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"mtime" bigint NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddingIndex_nomic_embed_text" ON "vector_data_nomic_embed_text" USING hnsw ("embedding" vector_cosine_ops);