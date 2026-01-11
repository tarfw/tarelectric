import { Asset } from 'expo-asset';
// Use legacy import for deprecated writeAsStringAsync
import * as FileSystem from 'expo-file-system/legacy';
// @ts-ignore
import { TextEmbeddingsModule } from 'react-native-executorch';

export class EmbeddingService {
    private hasInitialized = false;
    private initPromise: Promise<void> | null = null;
    private module: any = null;

    async init() {
        if (this.hasInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                // console.log('Initializing EmbeddingService...');

                if (!TextEmbeddingsModule) {
                    throw new Error('TextEmbeddingsModule is undefined. Check import from react-native-executorch.');
                }

                // 1. Load Model (.pte)
                const modelModule = require('../../assets/all-minilm-l6-v2.pte');
                const modelAsset = Asset.fromModule(modelModule);
                if (!modelAsset.localUri) {
                    await modelAsset.downloadAsync();
                }
                const modelPath = modelAsset.localUri;
                if (!modelPath) throw new Error('Failed to load model asset');

                // 2. Load Tokenizer (.json)
                const tokenizerContent = require('../../assets/tokenizer.json');
                const tokenizerPath = `${FileSystem.cacheDirectory}tokenizer.json`;
                await FileSystem.writeAsStringAsync(tokenizerPath, JSON.stringify(tokenizerContent));

                // Strip 'file://' prefix for native module compatibility on Android
                const cleanModelPath = modelPath.replace(/^file:\/\//, '');
                const cleanTokenizerPath = tokenizerPath.replace(/^file:\/\//, '');

                // console.log('Model loaded at:', cleanModelPath);
                // console.log('Tokenizer written to:', cleanTokenizerPath);

                // Initialize using the library's intended load() method.
                this.module = new TextEmbeddingsModule();

                await this.module.load({
                    modelSource: `file://${cleanModelPath}`,
                    tokenizerSource: `file://${cleanTokenizerPath}`
                });

                this.hasInitialized = true;
                // console.log('EmbeddingService ready');
            } catch (e) {
                console.error('Failed to initialize EmbeddingService', e);
                this.initPromise = null;
                throw e;
            }
        })();

        return this.initPromise;
    }

    private executionQueue: Promise<any> = Promise.resolve();

    async embed(text: string): Promise<number[]> {
        if (!this.hasInitialized) await this.init();

        // Chain execution to ensure sequential processing
        // Native model inference might not be thread-safe
        const currentTask = this.executionQueue.then(async () => {
            try {
                // Determine if text is a JSON object (like our metadata rows) and extract useful text if so
                let textToEmbed = text;
                try {
                    if (text.trim().startsWith('{')) {
                        const parsed = JSON.parse(text);
                        // If it's a product row, combine name and category and other fields
                        if (parsed.name) {
                            textToEmbed = `${parsed.name} ${parsed.category || ''} ${parsed.description || ''}`.trim();
                        } else if (parsed.text) {
                            textToEmbed = parsed.text;
                        }
                    }
                } catch (e) {
                    // Not valid JSON, just use raw text
                }

                // console.log(`Generating embedding for text: "${textToEmbed.slice(0, 50)}..."`);

                // Execute inference using forward (native method)
                const result = await this.module.forward(textToEmbed);

                if (result) {
                    // Convert to JS array
                    const vector = Array.from(result) as number[];
                    // console.log(`Generated vector (dim: ${vector.length})`);
                    return vector;
                } else {
                    console.warn('Warning: Result vector is empty/undefined', result);
                    return new Array(384).fill(0);
                }
            } catch (e) {
                console.error('Embedding generation failed', e);
                return new Array(384).fill(0);
            }
        });

        // Update queue pointer
        this.executionQueue = currentTask.catch(() => { });

        return currentTask;
    }
}

export const embeddingService = new EmbeddingService();
