/**
 * Rate Limiting System
 */

export class RateLimiter {
  constructor(requestsPerMinute = 30, burstLimit = 10, windowMs = 60000) {
    this.requestsPerMinute = requestsPerMinute;
    this.burstLimit = burstLimit;
    this.windowMs = windowMs;
    this.requests = [];
  }

  /**
   * Check if request can proceed
   */
  canMakeRequest() {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Check burst limit
    if (this.requests.length >= this.burstLimit) {
      return false;
    }

    // Check rate limit
    const requestsInWindow = this.requests.filter(
      timestamp => now - timestamp < 60000 // 1 minute
    );

    if (requestsInWindow.length >= this.requestsPerMinute) {
      return false;
    }

    return true;
  }

  /**
   * Record a request
   */
  recordRequest() {
    this.requests.push(Date.now());
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilNextRequest() {
    if (this.canMakeRequest()) {
      return 0;
    }

    const now = Date.now();
    const oldestRequest = Math.min(...this.requests);
    const timeSinceOldest = now - oldestRequest;

    // Time until burst limit clears
    const burstClearTime = this.windowMs - timeSinceOldest;

    // Time until rate limit clears (1 minute window)
    const rateClearTime = 60000 - (now - Math.min(...this.requests.filter(
      timestamp => now - timestamp < 60000
    )));

    return Math.min(burstClearTime, rateClearTime);
  }

  /**
   * Wait until next request is allowed
   */
  async waitForNextRequest() {
    const waitTime = this.getTimeUntilNextRequest();
    if (waitTime > 0) {
      console.log(`Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Execute function with rate limiting
   */
  async executeWithRateLimit(fn, description = 'API call') {
    await this.waitForNextRequest();

    try {
      const result = await fn();
      this.recordRequest();
      return result;
    } catch (error) {
      // Still record the request even on failure
      this.recordRequest();
      throw error;
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();
