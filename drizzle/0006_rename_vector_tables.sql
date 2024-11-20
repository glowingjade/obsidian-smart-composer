ALTER TABLE "vector_data_text_embedding_3_small" RENAME TO "vector_data_openai_text_embedding_3_small";--> statement-breakpoint
ALTER TABLE "vector_data_text_embedding_3_large" RENAME TO "vector_data_openai_text_embedding_3_large";--> statement-breakpoint
ALTER TABLE "vector_data_nomic_embed_text" RENAME TO "vector_data_ollama_nomic_embed_text";--> statement-breakpoint
ALTER TABLE "vector_data_mxbai_embed_large" RENAME TO "vector_data_ollama_mxbai_embed_large";--> statement-breakpoint
ALTER TABLE "vector_data_bge_m3" RENAME TO "vector_data_ollama_bge_m3";--> statement-breakpoint
ALTER INDEX IF EXISTS "embeddingIndex_text_embedding_3_small" RENAME TO "embeddingIndex_openai_text_embedding_3_small";--> statement-breakpoint
ALTER INDEX IF EXISTS "embeddingIndex_nomic_embed_text" RENAME TO "embeddingIndex_ollama_nomic_embed_text";--> statement-breakpoint
ALTER INDEX IF EXISTS "embeddingIndex_mxbai_embed_large" RENAME TO "embeddingIndex_ollama_mxbai_embed_large";--> statement-breakpoint
ALTER INDEX IF EXISTS "embeddingIndex_bge_m3" RENAME TO "embeddingIndex_ollama_bge_m3";--> statement-breakpoint