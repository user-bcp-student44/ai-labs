import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { bootstrapApplicationMock, httpProvider, routerProvider } = vi.hoisted(() => ({
  bootstrapApplicationMock: vi.fn(),
  httpProvider: { name: 'http-provider' },
  routerProvider: { name: 'router-provider' }
}));

vi.mock('@angular/platform-browser', () => ({
  bootstrapApplication: bootstrapApplicationMock
}));
vi.mock('@angular/common/http', () => ({
  provideHttpClient: () => httpProvider
}));
vi.mock('@angular/router', () => ({
  provideRouter: () => routerProvider
}));
vi.mock('./app/app.component', () => ({
  AppComponent: 'AppComponent'
}));
vi.mock('./app/app.routes', () => ({
  routes: []
}));

describe('application bootstrap', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('registers the HTTP client and router and reports bootstrap failures', async () => {
    const bootstrapError = new Error('bootstrap failed');
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    bootstrapApplicationMock.mockRejectedValueOnce(bootstrapError);

    await import('./main');
    await Promise.resolve();

    expect(bootstrapApplicationMock).toHaveBeenCalledWith(
      'AppComponent',
      { providers: [httpProvider, routerProvider] }
    );
    expect(logError).toHaveBeenCalledWith(bootstrapError);
  });
});
