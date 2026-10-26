import '@angular/compiler';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../environments/environment';
import { SessionService } from './session.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let http: { get: ReturnType<typeof vi.fn> };
  let sessionService: { readSession: ReturnType<typeof vi.fn> };
  let service: TasksService;

  beforeEach(() => {
    vi.restoreAllMocks();
    http = { get: vi.fn().mockReturnValue(of([])) };
    sessionService = {
      readSession: vi.fn().mockReturnValue({
        token: 'test-token',
        user: { username: 'student' }
      })
    };
    service = new TasksService(http as never, sessionService as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests tasks with the observed owner parameter and bearer token', async () => {
    await service.getTasks('student');

    const [url, options] = http.get.mock.calls[0];
    expect(url).toBe(environment.tasksApiUrl);
    expect(options.params.toString()).toBe('owner=student');
    expect(options.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('rejects a task request when no session exists', async () => {
    sessionService.readSession.mockReturnValue(null);

    await expect(service.getTasks('student')).rejects.toThrow(
      'Cannot request tasks without an active session'
    );
    expect(http.get).not.toHaveBeenCalled();
  });
});
