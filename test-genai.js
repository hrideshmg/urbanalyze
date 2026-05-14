const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  vertexai: true,
  project: 'project-a281dec4-d76b-4561-915',
  location: 'us-central1'
});

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'hello',
    });
    console.log(response.text);
  } catch (e) {
    console.log(e.message);
  }
}
run();
