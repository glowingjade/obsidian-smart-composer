CREATE TABLE IF NOT EXISTS "vector_data_mxbai_embed_large" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"mtime" bigint NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1024),
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddingIndex_mxbai_embed_large" ON "vector_data_mxbai_embed_large" USING hnsw ("embedding" vector_cosine_ops);