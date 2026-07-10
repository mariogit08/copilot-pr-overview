import { buildPRContext } from './src/core/context-builder/github';
import { GroqProvider } from './src/core/ai-providers/groq';

async function test() {
  const context = await buildPRContext('mariogit08', 'NotificationService', 2);
  const provider = new GroqProvider();
  
  // Note: Needs a real Groq API key, or relies on it being in the environment
  const config = {
    id: 'groq',
    apiKey: process.env.GROQ_API_KEY || 'YOUR_API_KEY_HERE', // Needs to be provided
    model: 'llama-3.3-70b-versatile',
  };

  if (config.apiKey === 'YOUR_API_KEY_HERE') {
    console.error('Please provide a GROQ_API_KEY environment variable.');
    return;
  }

  console.log('Fetching PR Context...');
  console.log('Diff Length:', context.compressedDiff.length);

  console.log('Calling Groq API...');
  let fullOutput = '';
  try {
    const result = await provider.analyzePullRequest(context, config, (chunk) => {
      fullOutput += chunk;
      process.stdout.write(chunk);
    });
    
    console.log('\n\n--- Final JSON Result ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('\nError calling Groq:', err);
    console.error('\nPartial Output:', fullOutput);
  }
}

test();
