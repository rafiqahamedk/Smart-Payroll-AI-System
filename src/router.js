// ================================================================
// SmartPayroll AI — Hash-based SPA Router
// ================================================================

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.currentParams = {};
    this._container = null;
    this._beforeHooks = [];
    this._afterHooks = [];

    window.addEventListener('hashchange', () => this._handleRoute());
  }

  /**
   * Register a route
   * @param {string} path - Route path (e.g., '/dashboard', '/employees/:id')
   * @param {Function} handler - Render function receiving (container, params)
   */
  register(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  /**
   * Set the DOM container for page content
   */
  setContainer(container) {
    this._container = container;
  }

  /**
   * Add a before-route hook
   */
  beforeEach(hook) {
    this._beforeHooks.push(hook);
  }

  /**
   * Add an after-route hook
   */
  afterEach(hook) {
    this._afterHooks.push(hook);
  }

  /**
   * Navigate to a route
   */
  navigate(path) {
    window.location.hash = '#' + path;
  }

  /**
   * Get the current hash path
   */
  getPath() {
    return window.location.hash.slice(1) || '/dashboard';
  }

  /**
   * Resolve route — handles params like /employees/:id
   */
  _resolve(path) {
    // Exact match first
    if (this.routes[path]) {
      return { handler: this.routes[path], params: {} };
    }

    // Param matching
    for (const [routePath, handler] of Object.entries(this.routes)) {
      const routeParts = routePath.split('/');
      const pathParts = path.split('/');

      if (routeParts.length !== pathParts.length) continue;

      const params = {};
      let match = true;

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }

      if (match) return { handler, params };
    }

    return null;
  }

  /**
   * Handle route change
   */
  async _handleRoute() {
    const path = this.getPath();

    // Run before hooks
    for (const hook of this._beforeHooks) {
      const proceed = await hook(path, this.currentRoute);
      if (proceed === false) return;
    }

    const resolved = this._resolve(path);
    if (!resolved) {
      // Fallback to dashboard
      this.navigate('/dashboard');
      return;
    }

    this.currentRoute = path;
    this.currentParams = resolved.params;

    if (this._container) {
      // Add exit animation
      this._container.style.opacity = '0';
      this._container.style.transform = 'translateY(8px)';

      await new Promise(r => setTimeout(r, 150));

      this._container.innerHTML = '';
      await resolved.handler(this._container, resolved.params);

      // Entry animation
      requestAnimationFrame(() => {
        this._container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        this._container.style.opacity = '1';
        this._container.style.transform = 'translateY(0)';
      });

      // Re-initialize lucide icons
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Run after hooks
      for (const hook of this._afterHooks) {
        hook(path, resolved.params);
      }
    }
  }

  /**
   * Start the router — trigger initial route
   */
  start() {
    this._handleRoute();
  }
}

export const router = new Router();
export default router;
