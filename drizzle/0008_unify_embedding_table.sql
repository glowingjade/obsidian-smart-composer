CREATE TABLE "embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"mtime" bigint NOT NULL,
	"content" text NOT NULL,
	"model" text NOT NULL,
	"dimension" smallint NOT NULL,
	"embedding" vector,
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint

CREATE INDEX "embeddings_path_index" ON "embeddings" USING btree ("path");--> statement-breakpoint
CREATE INDEX "embeddings_model_index" ON "embeddings" USING btree ("model");--> statement-breakpoint
CREATE INDEX "embeddings_dimension_index" ON "embeddings" USING btree ("dimension");--> statement-breakpoint
CREATE INDEX "embeddings_embedding_768_index" ON "embeddings" USING hnsw ((embedding::vector(768)) vector_cosine_ops) WHERE dimension = 768;--> statement-breakpoint
CREATE INDEX "embeddings_embedding_1024_index" ON "embeddings" USING hnsw ((embedding::vector(1024)) vector_cosine_ops) WHERE dimension = 1024;--> statement-breakpoint
CREATE INDEX "embeddings_embedding_1536_index" ON "embeddings" USING hnsw ((embedding::vector(1536)) vector_cosine_ops) WHERE dimension = 1536;--> statement-breakpoint

-- Migrate data from openai-text-embedding-3-small
INSERT INTO "embeddings" ("path", "mtime", "content", "model", "dimension", "embedding", "metadata")
SELECT "path", "mtime", "content", 'openai/text-embedding-3-small', 1536, "embedding", "metadata"
FROM "vector_data_openai_text_embedding_3_small";--> statement-breakpoint

-- Migrate data from openai-text-embedding-3-large
INSERT INTO "embeddings" ("path", "mtime", "content", "model", "dimension", "embedding", "metadata")
SELECT "path", "mtime", "content", 'openai/text-embedding-3-large', 3072, "embedding", "metadata"
FROM "vector_data_openai_text_embedding_3_large";--> statement-breakpoint

-- Migrate data from gemini-text-embedding-004
INSERT INTO "embeddings" ("path", "mtime", "content", "model", "dimension", "embedding", "metadata")
SELECT "path", "mtime", "content", 'gemini/text-embedding-004', 768, "embedding", "metadata"
FROM "vector_data_gemini_text_embedding_004";--> statement-breakpoint

-- Migrate data from nomic-embed-text
INSERT INTO "embeddings" ("path", "mtime", "content", "model", "dimension", "embedding", "metadata")
SELECT "path", "mtime", "content", 'ollama/nomic-embed-text', 768, "embedding", "metadata"
FROM "vector_data_ollama_nomic_embed_text";--> statement-breakpoint

-- Migrate data from mxbai-embed-large
INSERT INTO "embeddings" ("path", "mtime", "content", "model", "dimension", "embedding", "metadata")
SELECT "path", "mtime", "content", 'ollama/mxbai-embed-large', 1024, "embedding", "metadata"
FROM "vector_data_ollama_mxbai_embed_large";--> statement-breakpoint

-- Migrate data from bge-m3
INSERT INTO "embeddings" ("path", "mtime", "content", "model", "dimension", "embedding", "metadata")
SELECT "path", "mtime", "content", 'ollama/bge-m3', 1024, "embedding", "metadata"
FROM "vector_data_ollama_bge_m3";--> statement-breakpoint

DROP TABLE "vector_data_openai_text_embedding_3_small" CASCADE;--> statement-breakpoint
DROP TABLE "vector_data_openai_text_embedding_3_large" CASCADE;--> statement-breakpoint
DROP TABLE "vector_data_gemini_text_embedding_004" CASCADE;--> statement-breakpoint
DROP TABLE "vector_data_ollama_nomic_embed_text" CASCADE;--> statement-breakpoint
DROP TABLE "vector_data_ollama_mxbai_embed_large" CASCADE;--> statement-breakpoint
DROP TABLE "vector_data_ollama_bge_m3" CASCADE;
