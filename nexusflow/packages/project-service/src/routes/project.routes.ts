import type { FastifyInstance, FastifyRequest } from 'fastify';
import { projectService } from '../services/project.service.js';
import { authenticate } from '../middleware/authenticate.js';

export async function projectRoutes(app: FastifyInstance) {
  const a = [authenticate];

  // Projects
  app.post('/:wid/projects', { preHandler: a }, async (req, reply) => {
    const p = await projectService.createProject((req.params as any).wid, req.body as any);
    return reply.code(201).send({ success: true, data: p });
  });
  app.get('/:wid/projects', { preHandler: a }, async (req, reply) => {
    const result = await projectService.listProjects((req.params as any).wid, req.query as any);
    return reply.send({ success: true, ...result });
  });
  app.get('/:wid/projects/:pid', { preHandler: a }, async (req, reply) => {
    const p = await projectService.getProject((req.params as any).pid);
    return reply.send({ success: true, data: p });
  });
  app.patch('/:wid/projects/:pid', { preHandler: a }, async (req, reply) => {
    const p = await projectService.updateProject((req.params as any).pid, req.body as any);
    return reply.send({ success: true, data: p });
  });
  app.delete('/:wid/projects/:pid', { preHandler: a }, async (req, reply) => {
    await projectService.deleteProject((req.params as any).pid);
    return reply.send({ success: true, data: { message: 'Project deleted' } });
  });

  // Tasks
  app.post('/:wid/projects/:pid/tasks', { preHandler: a }, async (req, reply) => {
    const t = await projectService.createTask((req.params as any).wid, { ...(req.body as any), projectId: (req.params as any).pid });
    return reply.code(201).send({ success: true, data: t });
  });
  app.get('/:wid/projects/:pid/tasks', { preHandler: a }, async (req, reply) => {
    const result = await projectService.listTasks((req.params as any).pid, req.query as any);
    return reply.send({ success: true, ...result });
  });
  app.get('/:wid/projects/:pid/tasks/:tid', { preHandler: a }, async (req, reply) => {
    const t = await projectService.getTask((req.params as any).tid);
    return reply.send({ success: true, data: t });
  });
  app.patch('/:wid/projects/:pid/tasks/:tid', { preHandler: a }, async (req, reply) => {
    const t = await projectService.updateTask((req.params as any).tid, req.body as any);
    return reply.send({ success: true, data: t });
  });
  app.delete('/:wid/projects/:pid/tasks/:tid', { preHandler: a }, async (req, reply) => {
    await projectService.deleteTask((req.params as any).tid);
    return reply.send({ success: true, data: { message: 'Task deleted' } });
  });

  // Dependencies
  app.post('/:wid/tasks/:tid/dependencies', { preHandler: a }, async (req, reply) => {
    const d = await projectService.addDependency((req.params as any).tid, req.body as any);
    return reply.code(201).send({ success: true, data: d });
  });
  app.delete('/:wid/tasks/:tid/dependencies/:did', { preHandler: a }, async (req, reply) => {
    await projectService.removeDependency((req.params as any).did);
    return reply.send({ success: true, data: { message: 'Dependency removed' } });
  });

  // Sprints
  app.post('/:wid/projects/:pid/sprints', { preHandler: a }, async (req, reply) => {
    const s = await projectService.createSprint((req.params as any).wid, (req.params as any).pid, req.body as any);
    return reply.code(201).send({ success: true, data: s });
  });
  app.get('/:wid/projects/:pid/sprints', { preHandler: a }, async (req, reply) => {
    const sprints = await projectService.listSprints((req.params as any).pid);
    return reply.send({ success: true, data: sprints });
  });
  app.get('/:wid/sprints/:sid', { preHandler: a }, async (req, reply) => {
    const s = await projectService.getSprint((req.params as any).sid);
    return reply.send({ success: true, data: s });
  });
  app.patch('/:wid/sprints/:sid', { preHandler: a }, async (req, reply) => {
    const s = await projectService.updateSprint((req.params as any).sid, req.body as any);
    return reply.send({ success: true, data: s });
  });
  app.post('/:wid/sprints/:sid/start', { preHandler: a }, async (req, reply) => {
    await projectService.startSprint((req.params as any).sid);
    return reply.send({ success: true, data: { message: 'Sprint started' } });
  });
  app.post('/:wid/sprints/:sid/complete', { preHandler: a }, async (req, reply) => {
    await projectService.completeSprint((req.params as any).sid);
    return reply.send({ success: true, data: { message: 'Sprint completed' } });
  });

  // Time entries
  app.post('/:wid/time-entries', { preHandler: a }, async (req, reply) => {
    const te = await projectService.logTime({ ...(req.body as any), userId: req.user.sub });
    return reply.code(201).send({ success: true, data: te });
  });
  app.get('/:wid/tasks/:tid/time-entries', { preHandler: a }, async (req, reply) => {
    const entries = await projectService.getTaskTimeEntries((req.params as any).tid);
    return reply.send({ success: true, data: entries });
  });
}
