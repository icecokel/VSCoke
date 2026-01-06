---
trigger: always_on
---

# Browser Test Guide

1. **Port Configuration**
   - Use port **43000** for browser testing.
2. **Handling Port Conflicts**
   - If port **43000** is already in use, check the process occupying it.
   - If it is a Node.js process (which typically means the project is running), **kill the process** before starting the test.
3. **Cleanup**
   - After the browser test is complete, **terminate the running Next.js project** to release port 43000.
