console.log('Environment variables:', {
  // direct: process.env.EXPO_PUBLIC_AIRTABLE_API_KEY,
  direct_base: process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID,
});

const config = {
  airtableApiKey: process.env.EXPO_PUBLIC_AIRTABLE_API_KEY,
  airtableBaseId: process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID,
};

console.log('Config being used:', {
  apiKey: config.airtableApiKey ? 'Present' : 'Missing',
  baseId: config.airtableBaseId ? 'Present' : 'Missing',
  actualApiKey: config.airtableApiKey,
  actualBaseId: config.airtableBaseId
});

export { config };