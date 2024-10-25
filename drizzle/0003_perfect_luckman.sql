CREATE TABLE IF NOT EXISTS "vector_data_mxbai_embed_large" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"mtime" bigint NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(2048),
	"metadata" jsonb NOT NULL
);
