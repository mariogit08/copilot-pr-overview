import { buildPRContext } from './src/core/context-builder/github';

async function fetchDiff() {
  const context = await buildPRContext('mariogit08', 'NotificationService', 2);
  console.log('Diff Length:', context.compressedDiff.length);
  console.log('Diff Content (truncated for preview):');
  console.log(context.compressedDiff);
}

fetchDiff();
