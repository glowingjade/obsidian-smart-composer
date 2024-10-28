CREATE TABLE IF NOT EXISTS "vector_data_bge_m3" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"mtime" bigint NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1024),
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddingIndex_bge_m3" ON "vector_data_bge_m3" USING hnsw ("embedding" vector_cosine_ops);