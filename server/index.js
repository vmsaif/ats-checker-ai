const express = require('express');
const { VertexAI } = require('@google-cloud/vertexai');

const app = express();
const port = 3000;

// Google Vertex AI setup
const vertex_ai = new VertexAI({
    project: 'ats-checker-ai',
    location: 'us-central1'
});
const model = 'gemini-pro-vision';

const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: model,
    generation_config: {
        "max_output_tokens": 2048,
        "temperature": 0.4,
        "top_p": 1,
        "top_k": 32
    }
});

async function generateContent() {
    const req = {
        contents: [{role: 'user', parts: [{text: "You are a large language model (LLM) trained on a massive dataset of text and code. Your task is to check if the provided resume is ats friendly to the provided job description. After that, you will provide statistics of percentage match and then advise the missing keywords."}]}],
    };

    const streamingResp = await generativeModel.generateContentStream(req);

    let responseText = '';
    let metadata = '';
    for await (const item of streamingResp.stream) {
        if (item && item.candidates && item.candidates.length > 0) {
            responseText += item.candidates.map(candidate => candidate.content.parts.map(part => part.text).join('\n')).join('\n\n');
        }
    }

    const aggregatedResponse = await streamingResp.response;
    if (aggregatedResponse && aggregatedResponse.usageMetadata) {
        metadata = `Token Counts: Prompt - ${aggregatedResponse.usageMetadata.promptTokenCount}, Candidates - ${aggregatedResponse.usageMetadata.candidatesTokenCount}, Total - ${aggregatedResponse.usageMetadata.totalTokenCount}`;
    }

    return { responseText, metadata };
};

// Define a route
app.get('/generate-content', async (req, res) => {
    try {
        const { responseText, metadata } = await generateContent();
        res.send(`<pre>Generated Text: \n${responseText}\n\nMetadata: \n${metadata}</pre>`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


