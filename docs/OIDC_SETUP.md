# Configurar Trusted Publishing (OIDC) no npm

O Trusted Publishing permite publicar pacotes no npm sem precisar de tokens que expiram a cada 90 dias. Ele usa OIDC (OpenID Connect) para autenticar automaticamente usando o GitHub Actions.

## Passos para Configurar

### 1. Acesse as Configurações de Automação do npm

1. Vá para: https://www.npmjs.com/settings/YOUR_USERNAME/automation
   - Substitua `YOUR_USERNAME` pelo seu nome de usuário do npm

### 2. Configure o GitHub Actions

1. Na seção "GitHub Actions", clique em **"Add GitHub Actions"** ou **"Configure"**
2. Selecione o repositório: `MateusTorquato/mcp-server-manager`
3. Clique em **"Save"** ou **"Authorize"**

### 3. Verificar Configuração

Após configurar, o workflow do GitHub Actions usará automaticamente OIDC para autenticação quando você criar uma tag de release.

## Benefícios

- ✅ **Sem expiração de tokens** - Não precisa renovar tokens a cada 90 dias
- ✅ **Mais seguro** - Credenciais temporárias geradas automaticamente
- ✅ **Provenance** - Adiciona informações de proveniência aos pacotes publicados
- ✅ **Zero manutenção** - Configura uma vez e funciona para sempre

## Troubleshooting

Se o OIDC falhar:

1. Verifique se o Trusted Publishing está configurado no npm
2. Verifique se o repositório está listado nas configurações de automação
3. Como fallback temporário, você pode usar `NPM_TOKEN` secret no GitHub

## Referências

- [npm Trusted Publishing Documentation](https://docs.npmjs.com/using-github-actions-with-packages)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
