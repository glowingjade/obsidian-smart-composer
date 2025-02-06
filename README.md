<h1 align="center">Smart Composer</h1>

<p align="center">
  <a href="https://github.com/glowingjade/obsidian-smart-composer/wiki">Documentation</a>
  ·
  <a href="https://github.com/glowingjade/obsidian-smart-composer/issues">Report Bug</a>
  ·
  <a href="https://github.com/glowingjade/obsidian-smart-composer/discussions">Discussions</a>
</p>

![SC1_Title.gif](https://github.com/user-attachments/assets/a50a1f80-39ff-4eba-8090-e3d75e7be98c)

Everytime we ask ChatGPT, we need to put so much context information for each query. Why spend time putting background infos that are already in your vault?

**Smart Composer is an Obsidian plugin that helps you write efficiently with AI by easily referencing your vault content.** Inspired by Cursor AI and ChatGPT Canvas, this plugin unifies your note-taking and content creation process within Obsidian.

## Features

### Contextual Chat

![SC2_ContextChat.gif](https://github.com/user-attachments/assets/8da4c189-399a-450a-9591-95f1c9af1bc8)

> Upgrade your note-taking experience with our Contextual AI Assistant, inspired by Cursor AI. Unlike typical AI plugins, our assistant allows you to **precisely select the context for your conversation.**

- Type `@<fname>` to choose specific files/folders as your conversation context
- Get responses based on selected vault content

#### Multimedia Context

<img src="https://github.com/user-attachments/assets/b22175d4-80a2-4122-8555-2b9dd4987f93" alt="SC2-2_MultiContext.png" width="360"/>

Now, you can **add website links and images** as additional context for your queries.

- Website content is automatically extracted
- **Image support**: Add images directly to your chat through:
  - Upload button
  - Drag & drop
  - Paste from clipboard
- **Youtube link support**: YouTube transcripts are fetched and included as context
- **Coming soon**: Support for external files (PDF, DOCX, ...)

### Apply Edit

![SC3_ApplyEdit.gif](https://github.com/user-attachments/assets/35ee03ff-4a61-4d08-8032-ca61fb37dcf1)

> Smart Composer **suggests edits to your document.** You can apply with a single click.

- Offers document change recommendations
- Apply suggested changes instantly

### Vault Search (RAG)

![SC4_RAG-ezgif.com-crop-video.gif](https://github.com/user-attachments/assets/91c3ab8d-56d7-43b8-bb4a-1e73615a40ec)

> **Automatically find and use relevant notes** from your vault to enhance AI responses.

- Hit `Cmd+Shift+Enter` to run Vault Search answer
- Semantic search across your vault to find the most relevant context

#### Additional Features

- **Custom Model Selection**: Use your own model by setting your API Key (stored locally). Supported providers:
  - OpenAI
  - Anthropic
  - Google (Gemini)
  - Groq
  - DeepSeek
  - OpenRouter
  - Azure OpenAI
  - Ollama
  - LM Studio
  - Any other OpenAI-compatible providers
- **Local Model Support**: Run open-source LLMs and embedding models locally with [Ollama](https://ollama.ai) for complete privacy and offline usage.
- **Custom System Prompts**: Define your own system prompts that will be applied to every chat conversation.
- **Prompt Templates**: Create and reuse templates for common queries by typing `/` in the chat view. Perfect for standardizing repetitive tasks.
  - Create templates from any selected text with one click

## Getting Started

> **⚠️ Important: Installer Version Requirement**  
> Smart Composer requires a recent version of the Obsidian installer. If you experience issues with the plugin not loading properly:
> 
> 1. First, try updating Obsidian normally at `Settings > General > Check for updates`.
> 
> 2. If issues persist, manually update your Obsidian installer:
>    - Download the latest installer from [Obsidian's download page](https://obsidian.md/download)
>    - Close Obsidian completely
>    - Run the new installer

1. Open Obsidian Settings
2. Navigate to "Community plugins" and click "Browse"
3. Search for "Smart Composer" and click Install
4. Enable the plugin in Community plugins
5. Set up your API key in plugin settings
   - OpenAI : [ChatGPT API Keys](https://platform.openai.com/api-keys)
   - Anthropic : [Claude API Keys](https://console.anthropic.com/settings/keys)
   - Gemini : [Gemini API Keys](https://aistudio.google.com/apikey)
   - Groq : [Groq API Keys](https://console.groq.com/keys)

> **💡 Free Option Available**: While rate-limited, Gemini API provides the best performance among free models for Smart Composer. Recommended for users looking for a free option.

**📚 For detailed setup instructions and documentation, please visit our [Documentation](https://github.com/glowingjade/obsidian-smart-composer/wiki).**

## Roadmap

To see our up-to-date project roadmap and progress, please check out our [GitHub Projects kanban board](https://github.com/glowingjade/obsidian-smart-composer/projects?query=is%3Aopen).

Some of our planned features include:

- Support for external files (PDF, DOCX, etc.)
- Mentioning with tags or other metadata

## Feedback and Support

We value your input and want to ensure you can easily share your thoughts and report any issues:

- **Bug Reports**: If you encounter any bugs or unexpected behavior, please submit an issue on our [GitHub Issues](https://github.com/glowingjade/obsidian-smart-composer/issues) page. Be sure to include as much detail as possible to help us reproduce and address the problem.

- **Feature Requests**: For new feature ideas or enhancements, please use our [GitHub Discussions - Ideas & Feature Requests](https://github.com/glowingjade/obsidian-smart-composer/discussions/categories/ideas-feature-requests) page. Create a new discussion to share your suggestions. This allows for community engagement and helps us prioritize future developments.

- **Show and Tell**: We love seeing how you use Smart Composer! Share your unique use cases, workflows, or interesting applications of the plugin in the [GitHub Discussions - Smart Composer Showcase](https://github.com/glowingjade/obsidian-smart-composer/discussions/categories/smart-composer-showcase) page.

Your feedback and experiences are crucial in making Smart Composer better for everyone!

## Contributing

We welcome all kinds of contributions to Smart Composer, including bug reports, bug fixes, documentation improvements, and feature enhancements.

**For major feature ideas, please create an issue first to discuss feasibility and implementation approach.**

If you're interested in contributing, please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed information on:

- Setting up the development environment
- Our development workflow
- Working with the database schema
- The process for submitting pull requests
- Known issues and solutions for developers


## Contributors

### Core Team

These contributors were instrumental in shaping the initial vision, architecture, and design of Smart Composer:

**[@glowingjade](https://github.com/glowingjade)** ([Twitter](https://x.com/andy_suh_)), **[@kevin-on](https://github.com/kevin-on)**, **[@realsnoopso](https://github.com/realsnoopso)** ([Twitter](https://twitter.com/RealSnoopSo) · [LinkedIn](https://linkedin.com/in/realsnoopso)), **[@woosukji](https://github.com/woosukji)**

### Additional Contributors

We also want to thank everyone else who has contributed. Your time and effort help make Smart Composer better for everyone!

## License

This project is licensed under the [MIT License](LICENSE).

## Support the Project

If you find Smart Composer valuable, consider supporting its development:

<a href="https://www.buymeacoffee.com/glowingjade" target="_blank">
  <img src="https://github.com/user-attachments/assets/e794767d-b7dd-40eb-9132-e48ae7088000" alt="Buy Me A Coffee" width="180">
</a>

Follow me on X (Twitter) [@andy_suh_](https://x.com/andy_suh_) for updates and announcements!

Your support helps maintain and improve this plugin. Every contribution is appreciated and makes a difference. Thank you for your support!

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=glowingjade/obsidian-smart-composer&type=Date)](https://star-history.com/#glowingjade/obsidian-smart-composer&Date)
