ALTER TABLE "vector_data_text_embedding_3_small" RENAME TO "vector_data_openai_text_embedding_3_small";--> statement-breakpoint
ALTER TABLE "vector_data_text_embedding_3_large" RENAME TO "vector_data_openai_text_embedding_3_large";--> statement-breakpoint
ALTER TABLE "vector_data_nomic_embed_text" RENAME TO "vector_data_ollama_nomic_embed_text";--> statement-breakpoint
ALTER TABLE "vector_data_mxbai_embed_large" RENAME TO "vector_data_ollama_mxbai_embed_large";--> statement-breakpoint
ALTER TABLE "vector_data_bge_m3" RENAME TO "vector_data_ollama_bge_m3";--> statement-breakpoint
DROP INDEX IF EXISTS "embeddingIndex_text_embedding_3_small";--> statement-breakpoint
DROP INDEX IF EXISTS "embeddingIndex_nomic_embed_text";--> statement-breakpoint
DROP INDEX IF EXISTS "embeddingIndex_mxbai_embed_large";--> statement-breakpoint
DROP INDEX IF EXISTS "embeddingIndex_bge_m3";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddingIndex_openai_text_embedding_3_small" ON "vector_data_openai_text_embedding_3_small" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddingIndex_ollama_nomic_embed_text" ON "vector_data_ollama_nomic_embed_text" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddingIndex_ollama_mxbai_embed_large" ON "vector_data_ollama_mxbai_embed_large" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddingIndex_ollama_bge_m3" ON "vector_data_ollama_bge_m3" USING hnsw ("embedding" vector_cosine_ops);