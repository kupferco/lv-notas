console.log('Environment variables:', {
  direct_api: (process.env.EXPO_PUBLIC_AIRTABLE_API_KEY) ? 'Present' : 'Missing',
  direct_base: process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID,
});

const config = {
  airtableApiKey: process.env.EXPO_PUBLIC_AIRTABLE_API_KEY,
  airtableBaseId: process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID,
};

console.log('Config being used:', {
  apiKey: config.airtableApiKey ? 'Present' : 'Missing',
  baseId: config.airtableBaseId ? 'Present' : 'Missing',
  actualApiKey: 'Not telling you.',
  actualBaseId: config.airtableBaseId
});

export { config };