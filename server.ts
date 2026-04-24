import express from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createServer as createViteServer } from 'vite';
import path from 'path';

// Assuming service account is provided via environment variables in production-like environments or handled by the platform
// The platform manages GCP credentials for firebase-admin automatically if GOOGLE_APPLICATION_CREDENTIALS is set
initializeApp({}); 

const app = express();
app.use(express.json());
const PORT = 3000;

import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy initialization for Gemini
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

function getGeminiModel() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return model;
}

app.post('/api/chat', async (req, res) => {
  const { prompt, data } = req.body;
  
  // Enhanced prompt to force JSON response
  const simplifiedData = {
    resourcePlan: data.resourcePlan
  };

  const systemInstruction = `You are a smart AI assistant for a Services Pricing Workbook project.
  You are given the current resource planning data: ${JSON.stringify(simplifiedData)}.
  
  If the user asks to modify the project data (like adding hours, changing rates), you MUST calculate the numeric updates required.
  You must identify the correct entry in "resourcePlan" by matching the "role" field (e.g., "Developer Resource").
  
  Output valid JSON format ONLY in the following absolute structure, with NO other text. You MUST return the FULL object from "resourcePlan" with the modified field updated:
  {
    "type": "update",
    "updates": { 
        "resourcePlan": [ 
            { 
               "id": "full-id",
               "role": "full-role-name",
               "country": "country",
               "weeks": 10,
               "hoursPerWeek": 10
               // ... other fields must be included ...
            }
        ]
    }
  }
  
  If you are not certain about the update, or the user is not asking for a data change, reply with a normal text message.
  
  User request: ${prompt}`;

  try {
    const aiModel = getGeminiModel();
    const result = await aiModel.generateContent(systemInstruction);
    const responseText = result.response.text();
    console.log("Raw AI Response:", responseText); // Debugging
    
    // Parse response for updates
    let reply = responseText;
    let updates = null;
    try {
        // Try to find if JSON is buried in response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            console.log("Found potential JSON:", jsonMatch[0]);
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.type === 'update') {
                updates = parsed.updates;
                reply = "I have updated the plan according to your request.";
            }
        }
    } catch (e) {
        console.error("Failed to parse AI update", e);
    }
    
    res.json({ reply, updates });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to process AI chat' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
