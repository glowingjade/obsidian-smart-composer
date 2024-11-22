CREATE TABLE IF NOT EXISTS "vector_data_gemini_text_embedding_004" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"mtime" bigint NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddingIndex_gemini_text_embedding_004" ON "vector_data_gemini_text_embedding_004" USING hnsw ("embedding" vector_cosine_ops);