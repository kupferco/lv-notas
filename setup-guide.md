# How to start a React Expo project


1. Create the Expo project
```bash
npx create-expo-app@latest . --template blank
```

2. Add typescript and dependecies
```bash
npx expo customize tsconfig.json
npm install -D @types/react @types/react-native
```

3. Rename _App.js_ to _App.tsx_.


## Install AirTable

```bash
npm install airtable axios @react-native-async-storage/async-storage
npm install airt
npm install airtable @types/airtable
```

- More config stuff
```bash
npm install expo-constants
```

## Install dotenv to manage .env.local

1. Install dotenv
```bash
npm install react-native-dotenv
npm install -D @types/react-native-dotenv
```

2. Create a _babel.config.js_ on the root

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv']
    ]
  };
};
```

3. Create a _env.d.ts_ on the root

```javascript
declare module '@env' {
  export const CLIENT_API_KEY: string;
  // Add other environment variables you want to use
}
```

4. Update _tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["react-native-dotenv"]
  }
}
```


## Deploying

```bash
expo build:web
firebase deploy --only hosting
```