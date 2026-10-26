import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSession } from '../models/auth.models';
import { Task } from '../models/task.model';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };
  let sessionService: {
    readSession: ReturnType<typeof vi.fn>;
    clearSession: ReturnType<typeof vi.fn>;
  };
  let tasksService: { getTasks: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', { removeItem: vi.fn() });
    vi.stubGlobal('sessionStorage', { removeItem: vi.fn() });
    router = { navigate: vi.fn().mockResolvedValue(true) };
    sessionService = {
      clearSession: vi.fn(),
      readSession: vi.fn().mockReturnValue({
        token: 'test-token',
        user: { username: 'student', displayName: 'Student' }
      } satisfies UserSession)
    } as typeof sessionService;
    tasksService = { getTasks: vi.fn() };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createComponent(): DashboardComponent {
    return new DashboardComponent(router as never, sessionService as never, tasksService as never);
  }

  it('redirects to login when no session is available', async () => {
    sessionService.readSession.mockReturnValue(null);
    const component = createComponent();

    await component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(tasksService.getTasks).not.toHaveBeenCalled();
    expect(component.loading).toBe(true);
  });

  it('loads tasks for the signed-in user', async () => {
    tasksService.getTasks.mockResolvedValue([]);
    const component = createComponent();

    await component.ngOnInit();

    expect(tasksService.getTasks).toHaveBeenCalledWith('student');
    expect(component.user).toEqual({ username: 'student', displayName: 'Student' });
    expect(component.visibleTasks).toEqual([]);
    expect(component.loading).toBe(false);
  });

  it('hides archived tasks, labels visible tasks, and sorts by descending priority', async () => {
    const tasks: Task[] = [
      { id: 'low', title: 'Low', status: 'TODO', priority: 'LOW', owner: 'student' },
      { id: 'archived', title: 'Archived', status: 'ARCHIVED', priority: 'URGENT', owner: 'student' },
      { id: 'high', title: 'High', status: 'DONE', priority: 'HIGH', owner: 'student' }
    ];
    tasksService.getTasks.mockResolvedValue(tasks);
    const component = createComponent();

    await component.ngOnInit();

    expect(component.visibleTasks.map((task) => task.id)).toEqual(['low', 'high']);
    expect(component.visibleTasks.map((task) => task.label)).toEqual([
      'LOW · STUDENT',
      'HIGH · STUDENT'
    ]);
    expect(component.tasks).toEqual(tasks);
    expect(component.loading).toBe(false);
  });

  it('shows a generic message when the task request fails', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    tasksService.getTasks.mockRejectedValue(
      new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        error: { detail: 'internal backend details' }
      })
    );
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard. Inténtalo de nuevo.');
    expect(component.error).not.toContain('internal backend details');
    expect(component.loading).toBe(false);
    expect(logError).toHaveBeenCalled();
  });

  it('shows a generic message for an invalid task token without clearing the session', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    tasksService.getTasks.mockRejectedValue(
      new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
    );
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard. Inténtalo de nuevo.');
    expect(sessionService.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.loading).toBe(false);
    expect(logError).toHaveBeenCalled();
  });

  it('shows a generic message when the task request times out', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    tasksService.getTasks.mockRejectedValue(
      new HttpErrorResponse({ status: 0, statusText: 'Timeout' })
    );
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard. Inténtalo de nuevo.');
    expect(component.loading).toBe(false);
    expect(logError).toHaveBeenCalled();
  });

  it('shows a generic message when the task service is unavailable', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    tasksService.getTasks.mockRejectedValue(
      new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        error: new Error('Connection refused')
      })
    );
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard. Inténtalo de nuevo.');
    expect(component.loading).toBe(false);
    expect(logError).toHaveBeenCalled();
  });

  it('shows a generic message when the successful task body is not an array', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    tasksService.getTasks.mockResolvedValue({ data: [] });
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard. Inténtalo de nuevo.');
    expect(component.loading).toBe(false);
    expect(logError).toHaveBeenCalled();
  });

  it('clears session and navigates to login on logout', async () => {
    const component = createComponent();

    await component.logout();

    expect(sessionService.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('maps known statuses and preserves unknown status labels', () => {
    const component = createComponent();

    expect(component.statusLabel('todo')).toBe('Por hacer');
    expect(component.statusLabel('custom')).toBe('custom');
  });
});
