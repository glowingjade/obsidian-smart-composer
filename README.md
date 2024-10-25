# Obsidian Smart Composer

![SC1_Title.gif](https://github.com/user-attachments/assets/a50a1f80-39ff-4eba-8090-e3d75e7be98c)

Everytime we ask ChatGPT, we need to put so much context information for each query. Why spend time putting background infos that are already in your vault?

**Obsidian Smart Composer is a plugin that helps you write efficiently with AI by easily referencing your vault content.** Inspired by Cursor AI and ChatGPT Canvas, this plugin unifies your note-taking and content creation process within Obsidian.

## Features

### Contextual Chat

![SC2_ContextChat.gif](https://github.com/user-attachments/assets/8da4c189-399a-450a-9591-95f1c9af1bc8)

> Upgrade your note-taking experience with our Contextual AI Assistant, inspired by Cursor AI. Unlike typical AI plugins, our assistant allows you to precisely select the context for your interactions.

- Type `@<filename>` to choose specific files as your conversation context
- Get responses based on selected vault content

### Apply Edit

![SC3_ApplyEdit.gif](https://github.com/user-attachments/assets/35ee03ff-4a61-4d08-8032-ca61fb37dcf1)

> Smart Composer suggests edits to your document. You can apply with a single click.

- Offers document change recommendations
- Apply suggested changes instantly

Note: The Apply Edit feature is currently slower than desired. We are working on improvements in future updates.

#### Additional Features

- **Custom Model Selection** : Use your own model by setting your API Key (stored locally).

## Getting Started

Currently, Obsidian Smart Composer is available through [Beta Quickstart](#beta-quickstart-recommended) or [Manual Installation](#manual-installation). Community plugin support is coming soon.

### Beta Quickstart (Recommended)

To install Obsidian Smart Composer as a beta plugin:

1. Install the BRAT plugin if you haven't already. [Click here](obsidian://show-plugin?id=obsidian42-brat) to install BRAT in Obsidian.
2. Open the command palette and run the command **"BRAT: Add a beta plugin for testing"**.
3. Copy and paste this link into the modal: https://github.com/glowingjade/obsidian-smart-composer and click "Add Plugin" and wait for the installation.
4. Go to `Settings > Community plugins` and refresh the list of plugins. Enable "Obsidian Smart Composer".

### Initial Setup

> You need to set up your API key to use the plugin.

1. Obtain an API key from your preferred AI service provider. (You need to create an account to get API key.)

   - OpenAI : [ChatGPT API Keys](https://platform.openai.com/api-keys)
   - Anthropic : [Claude API Keys](https://console.anthropic.com/settings/keys)
   - Groq : [Groq API Keys](https://console.groq.com/keys)

2. In Obsidian, go to `Settings > Obsidian Smart Composer`.
3. Enter your API key in the designated field.

### Commands and Hotkeys

Obsidian Smart Composer adds a few commands to work with AI. You can set custom hotkeys for these commands by going to `Settings > Hotkeys` and searching for "Obsidian Smart Composer". (Note: Hotkeys are unset by default)

| Command               | Description                                | Preferred Hotkey |
| --------------------- | ------------------------------------------ | ---------------- |
| Open Chat View        | Opens the AI chat interface                | `Cmd+Shift+L`    |
| Add Selection to Chat | Adds the selected text to the current chat | `Cmd+L`          |

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/glowingjade/obsidian-smart-composer/releases/latest).
2. Create a folder named `obsidian-smart-composer` in your vault's `<Vault>/.obsidian/plugins/` directory.
3. Place the downloaded files into this new folder.
4. Open Obsidian settings `Settings > Community plugins`, and enable Obsidian Smart Composer.

## Roadmap

#### Expanded Context Support

- Folder context mentioning, and auto context selection (RAG)
- PDF, DOCX, and image understanding
- Web content browsing

#### Advanced Search

- Chat with AI to find specific notes or content

#### Prompt Presets

- Save and reuse custom prompts for common tasks

#### Tab Completion

- Copilot-like autocomplete
- Context-aware suggestions based on your writing style and vault content

## Feedback and Support

We value your input and want to ensure you can easily share your thoughts and report any issues:

- **Bug Reports**: If you encounter any bugs or unexpected behavior, please submit an issue on our [GitHub Issues](https://github.com/glowingjade/obsidian-smart-composer/issues) page. Be sure to include as much detail as possible to help us reproduce and address the problem.

- **Feature Requests**: For new feature ideas or enhancements, please use our [GitHub Discussions - Ideas](https://github.com/glowingjade/obsidian-smart-composer/discussions/categories/ideas) page. Create a new discussion to share your suggestions. This allows for community engagement and helps us prioritize future developments.

- **Show and Tell**: We love seeing how you use Obsidian Smart Composer! Share your unique use cases, workflows, or interesting applications of the plugin in the [GitHub Discussions - Show and Tell](https://github.com/glowingjade/obsidian-smart-composer/discussions/categories/show-and-tell) page.

Your feedback and experiences are crucial in making Obsidian Smart Composer better for everyone!

## Contributing

We welcome all kinds of contributions to Obsidian Smart Composer, including bug reports, bug fixes, documentation improvements, and feature enhancements.

If you're interested in contributing, please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed information on:

- Setting up the development environment
- Our development workflow
- Working with the database schema
- The process for submitting pull requests
- Known issues and solutions for developers

For major feature ideas, please create an issue first to discuss feasibility and implementation approach.

## License

This project is licensed under the [MIT License](LICENSE).