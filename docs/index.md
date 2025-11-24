---
layout: page
---

<style scoped>
.hero {
  text-align: center;
  padding: 60px 20px;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  font-weight: 700;
}

.hero p {
  font-size: 1.2rem;
  color: var(--vp-c-text-2);
  margin-bottom: 40px;
  line-height: 1.6;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 80px;
}

.cta-button {
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 2px solid;
  cursor: pointer;
}

.cta-button.primary {
  background-color: var(--vp-button-brand-bg);
  color: white;
  border-color: var(--vp-button-brand-bg);
}

.cta-button.primary:hover {
  background-color: var(--vp-button-brand-hover-bg);
}

.cta-button.secondary {
  background-color: transparent;
  color: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
}

.cta-button.secondary:hover {
  background-color: var(--vp-c-brand-soft);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  margin-bottom: 80px;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
}

.feature-card {
  padding: 30px;
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.feature-card h3 {
  font-size: 1.3rem;
  margin-bottom: 12px;
  color: var(--vp-c-brand);
}

.feature-card p {
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
}

.docs-link {
  padding: 20px;
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  transition: all 0.3s ease;
  color: inherit;
}

.docs-link:hover {
  border-color: var(--vp-c-brand);
  background-color: var(--vp-c-bg-mute);
}

.docs-link h4 {
  margin-top: 0;
  color: var(--vp-c-brand);
}

.docs-link p {
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
  margin: 10px 0 0 0;
}
</style>

<div class="hero">
  <h1>Welcome to MCP Server Manager</h1>
  <p>
    The all-in-one CLI tool to manage your MCP servers across all clients.<br>
    One central place to add, test, and sync servers to Claude, Cursor, Windsurf, and VS Code.
  </p>

  <div class="cta-buttons">
    <a href="guide/getting-started" class="cta-button primary">Get Started</a>
    <a href="guide/architecture" class="cta-button secondary">Learn How It Works</a>
  </div>
</div>

## Why MCP Server Manager?

<div class="features">
  <div class="feature-card">
    <h3>🎯 Gateway Pattern</h3>
    <p>Add servers once, connect all clients. The gateway automatically proxies requests to your servers.</p>
  </div>

  <div class="feature-card">
    <h3>⚡ Automatic Sync</h3>
    <p>Change your port once. All connected clients update instantly without restart.</p>
  </div>

  <div class="feature-card">
    <h3>🎨 Interactive TUI</h3>
    <p>Beautiful terminal UI with keyboard shortcuts for managing servers, testing, and connecting clients.</p>
  </div>

  <div class="feature-card">
    <h3>🧪 Built-in Testing</h3>
    <p>Test all servers in parallel before using them. Verify tools and check token counts instantly.</p>
  </div>

  <div class="feature-card">
    <h3>📦 Import/Export</h3>
    <p>Migrate your server configurations between machines and clients with a single command.</p>
  </div>

  <div class="feature-card">
    <h3>🛠️ Daemon Mode</h3>
    <p>Run the gateway in the background with auto-start support for hands-off operation.</p>
  </div>
</div>

## Documentation

<div class="docs-grid">
  <a href="guide/getting-started" class="docs-link">
    <h4>Getting Started</h4>
    <p>Installation, setup, and your first steps with MCP Server Manager.</p>
  </a>

  <a href="guide/architecture" class="docs-link">
    <h4>Architecture</h4>
    <p>Understand how the gateway pattern works and how servers are connected.</p>
  </a>

  <a href="guide/client-connections" class="docs-link">
    <h4>Client Connections</h4>
    <p>Connect Claude Desktop, Cursor, Windsurf, VS Code, and other clients.</p>
  </a>

  <a href="tui/overview" class="docs-link">
    <h4>TUI Guide</h4>
    <p>Navigate the terminal interface and learn all available keyboard shortcuts.</p>
  </a>

  <a href="cli/servers" class="docs-link">
    <h4>CLI Commands</h4>
    <p>Complete reference of all CLI commands and options for scripting and automation.</p>
  </a>

  <a href="guide/troubleshooting" class="docs-link">
    <h4>Troubleshooting</h4>
    <p>Common issues, FAQs, and solutions for getting the most out of your setup.</p>
  </a>
</div>

---

<div style="text-align: center; margin-top: 60px; padding-top: 40px; border-top: 1px solid var(--vp-c-divider);">
  <p style="color: var(--vp-c-text-2);">
    Questions? Check out our <a href="guide/troubleshooting">troubleshooting guide</a> or
    open an issue on <a href="https://github.com/MateusTorquato/mcp-server-manager">GitHub</a>.
  </p>
</div>
