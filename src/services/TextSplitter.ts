export class TextSplitter {
    static split(text: string, chunkSize: number = 512, overlap: number = 64): string[] {
        if (!text) return [];

        // Simple character-based split for now. 
        // Ideally this should be token-based using the tokenizer.json, but for now strict length is safer.
        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            chunks.push(text.slice(start, end));

            if (end === text.length) break;
            start += (chunkSize - overlap);
        }

        return chunks;
    }
}
