import type { CreateProjectRequest, ProjectWithStats, UpdateProjectRequest } from '@/types/api';
import { request } from './client';

interface ProjectListResponse {
  projects: ProjectWithStats[];
}

interface ProjectResponse {
  project: ProjectWithStats;
}

/** Recently updated first. */
export async function listProjects(signal?: AbortSignal): Promise<ProjectWithStats[]> {
  const { projects } = await request<ProjectListResponse>('GET', '/projects', { signal });
  return projects;
}

export async function getProject(projectId: string, signal?: AbortSignal): Promise<ProjectWithStats> {
  const { project } = await request<ProjectResponse>('GET', `/projects/${projectId}`, { signal });
  return project;
}

export async function createProject(body: CreateProjectRequest): Promise<ProjectWithStats> {
  const { project } = await request<ProjectResponse>('POST', '/projects', { body });
  return project;
}

export async function updateProject(
  projectId: string,
  body: UpdateProjectRequest,
): Promise<ProjectWithStats> {
  const { project } = await request<ProjectResponse>('PATCH', `/projects/${projectId}`, { body });
  return project;
}

/** Also deletes the project's sprints and todos. */
export function deleteProject(projectId: string): Promise<void> {
  return request<undefined>('DELETE', `/projects/${projectId}`);
}
