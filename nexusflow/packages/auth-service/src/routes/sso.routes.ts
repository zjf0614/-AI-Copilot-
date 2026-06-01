// SSO routes: provider discovery, authorize, callback

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ssoConfigRepo, workspaceRepo } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';

export async function ssoRoutes(app: FastifyInstance) {

  // GET /providers — list SSO providers for a workspace
  app.get('/providers', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceSlug } = request.query as { workspaceSlug?: string };

    if (!workspaceSlug) {
      throw AppError.validation('workspaceSlug query parameter required');
    }

    const workspace = await workspaceRepo.findBySlug(workspaceSlug);
    if (!workspace) {
      throw AppError.notFound('Workspace');
    }

    const configs = await ssoConfigRepo.findByWorkspace(workspace.id);
    return reply.send({
      success: true,
      data: configs.map(c => ({
        id: c.id,
        provider: c.provider,
        isEnabled: c.isEnabled,
        domain: c.domain,
      })),
    });
  });

  // POST /:provider/authorize — initiate SSO authorization flow
  app.post('/:provider/authorize', async (request: FastifyRequest, reply: FastifyReply) => {
    const { provider } = request.params as { provider: string };
    const { workspaceSlug, redirectUri } = request.body as { workspaceSlug: string; redirectUri?: string };

    const workspace = await workspaceRepo.findBySlug(workspaceSlug);
    if (!workspace) {
      throw AppError.notFound('Workspace');
    }

    const ssoConfig = await ssoConfigRepo.findByWorkspaceAndProvider(workspace.id, provider as any);
    if (!ssoConfig || !ssoConfig.isEnabled) {
      throw AppError.notFound('SSO configuration');
    }

    // TODO: Full SSO implementation — for now return a stub
    // The actual SSO flow will:
    // 1. For OIDC: construct authorization URL with PKCE, return redirect URL
    // 2. For SAML: generate AuthnRequest, return IdP redirect URL

    return reply.send({
      success: true,
      data: {
        redirectUrl: `https://sso.stub/${provider}/authorize?workspace=${workspace.slug}`,
        message: 'SSO authorization initiated (stub — full OIDC/SAML implementation in Phase 4)',
      },
    });
  });

  // GET /:provider/callback — SSO callback endpoint
  app.get('/:provider/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const { provider } = request.params as { provider: string };
    const query = request.query as Record<string, string>;

    // TODO: Full SSO callback handling in Phase 4
    return reply.send({
      success: true,
      data: {
        message: `SSO callback received for ${provider} (stub — full implementation in Phase 4)`,
        query,
      },
    });
  });

  // GET /discover — domain-based IdP discovery
  app.get('/discover', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.query as { email?: string };

    if (!email || !email.includes('@')) {
      throw AppError.validation('Valid email required');
    }

    const domain = email.split('@')[1]!;
    const ssoConfig = await ssoConfigRepo.findByDomain(domain);

    if (!ssoConfig) {
      return reply.send({
        success: true,
        data: { found: false, message: 'No SSO provider configured for this domain' },
      });
    }

    return reply.send({
      success: true,
      data: {
        found: true,
        provider: ssoConfig.provider,
        domain: ssoConfig.domain,
      },
    });
  });
}
