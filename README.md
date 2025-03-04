> ⚠️ **Note:** OAK is currently in pre alpha and not ready for testing. Please stay tuned and check back in a couple of days.

# Welcome to OPEN AGENT KIT (OAK)

OAK is an extensible open source platform for building and deploying AI agents!
Website: https://open-agent-kit.com

## Features

- 🧠 Built-in knowledge base (upload PDFs, Word Docs, CSV, JSON, etc.)
- 🐳 Deployable as a Docker container
- 🤖 Connect to any LLM (OpenAI, Anthropic, Google, Self-hosted, etc.)
- 🔌 Plugin Ecosystem
- 🛠️ Built-in tools
- 💬 Embeddable Chat UI (add it to your website in minutes)

## Deploy with ease

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbyarcnine%2Fopen-agent-kit&env=APP_SECRET,OPENAI_API_KEY,SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASSWORD&envDescription=You%20can%20generate%20the%20secret%20with%20this%20link.&envLink=https%3A%2F%2Fdocs.open-agent-kit.com%2Fenvironment-variables&project-name=open-agent-kit&repository-name=open-agent-kit&integration-ids=oac_3sK3gnG06emjIEVL09jjntDD)

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/byarcnine/open-agent-kit/tree/main)

More guides are available [here](https://docs.open-agent-kit.com/guides/deployment)

## Build on the best open source libraries

- 🛣️ [React Router](https://reactrouter.com/)
- 🎨 [Shadcn UI](https://ui.shadcn.com/)
- 🔒 [Better Auth](https://github.com/better-auth/better-auth)
- 🐘 [Postgres & PGVector](https://www.postgresql.org/)
- ⚡ [AI SDK](https://github.com/vercel/ai)

## Join the community

- [Discord](https://discord.gg/ajFMK9fcYw)

## How to run locally with docker (quick start)

use this option if you want to run the app locally without any changes.

1. Get your OpenAI API key. You can get it from [here](https://platform.openai.com/api-keys)
2. Run the following command to start the app

```bash
npx @open-agent-kit/cli docker
```

3. Open the app in your browser

```bash
http://localhost:3000
```

## How to run locally (advanced)

use this option if you want to change the default model, install plugins, or create your own plugins.

1. Scaffold a new project

```bash
npx @open-agent-kit/create-oak my-new-oak
```

2. Set the environment variables in the `.env` file (use the `.env.example` file as a reference)
3. Run the following command to start the app

```bash
npm run dev
```

4. Open the app in your browser

```bash
http://localhost:5173
```

5. Deploy
   Read our [deployment docs](https://docs.open-agent-kit.com/guides/deployment)

## Plugin Ecosystem

OAK is designed to be extensible with plugins. From custom knowledge providers, tools, pages, the sky is the limit!
Create your own plugins or use the ones made by the community!
Get started with the [plugin docs](https://docs.open-agent-kit.com/plugins/introduction)

## Read the docs

[Docs](https://docs.open-agent-kit.com)

## Contributing

We love contributions! Please read the [contributing guide](CONTRIBUTING.md) to get started.
