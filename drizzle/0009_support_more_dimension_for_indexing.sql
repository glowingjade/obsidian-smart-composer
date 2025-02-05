CREATE INDEX "embeddings_embedding_128_index" ON "embeddings" USING hnsw ((embedding::vector(128)) vector_cosine_ops) WHERE dimension = 128;--> statement-breakpoint
CREATE INDEX "embeddings_embedding_256_index" ON "embeddings" USING hnsw ((embedding::vector(256)) vector_cosine_ops) WHERE dimension = 256;--> statement-breakpoint
CREATE INDEX "embeddings_embedding_384_index" ON "embeddings" USING hnsw ((embedding::vector(384)) vector_cosine_ops) WHERE dimension = 384;--> statement-breakpoint
CREATE INDEX "embeddings_embedding_512_index" ON "embeddings" USING hnsw ((embedding::vector(512)) vector_cosine_ops) WHERE dimension = 512;--> statement-breakpoint
CREATE INDEX "embeddings_embedding_1280_index" ON "embeddings" USING hnsw ((embedding::vector(1280)) vector_cosine_ops) WHERE dimension = 1280;--> statement-breakpoint
CREATE INDEX "embeddings_embedding_1792_index" ON "embeddings" USING hnsw ((embedding::vector(1792)) vector_cosine_ops) WHERE dimension = 1792; 