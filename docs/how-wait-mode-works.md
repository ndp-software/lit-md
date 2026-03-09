# How --wait Mode Works

A detailed walkthrough of the `--wait` mode implementation in lit-md, explaining every piece of the code.

## 1. Startup Phase

**File: `cli.ts` lines 38-43**

```typescript
const wait = extractFlag('--wait')
```

When a user runs:

```bash
lit-md --wait --test file.lit-md.ts
```

The `extractFlag()` function checks if `--wait` is in the argument list. If found, it removes it from `args` and returns `true`. The `wait` variable is then used throughout the program to change behavior.

## 2. Entry Point - Main Async Function

**File: `cli.ts` lines 302-313**

```typescript
;(async () => {
  await executeTasks()  // ← Run ONCE on startup

  if (wait && process.stdin.isTTY) {  // ← If --wait AND interactive terminal
    while (true) {                     // ← INFINITE LOOP
      const trigger = await watchFilesAndWait(inputPaths)
      await executeTasks()  // ← Run again on change/spacebar
    }
  }
})()
```

This is where the main logic happens:

1. **First run**: `executeTasks()` is called once immediately
2. **Check conditions**: 
   - `wait` = user passed `--wait` flag
   - `process.stdin.isTTY` = terminal is interactive (not piped/redirected)
3. **If both true**: Enter infinite loop that:
   - Waits for file changes or spacebar
   - Runs `executeTasks()` again
   - Loops back to wait

If either condition is false, the program ends after the first run.

## 3. First Run: executeTasks()

**File: `cli.ts` lines 249-300**

This function runs on startup AND every time through the watch loop. It performs three tasks in order:

### 3a) Typecheck (if `--typecheck` flag used)

**Lines 250-259**

```typescript
if (runTypecheck) {
  const result = typecheck(inputPaths.map(p => resolve(p)))
  if (!result.ok) {
    for (const msg of result.messages) console.error(msg)
    // In wait mode, report error but continue; in normal mode, exit
    if (!wait) process.exit(1)
    // Continue to markdown generation even if typecheck failed
  }
}
```

**Key difference in wait mode**: If typecheck fails, the program prints the error but **doesn't exit**. It continues to the next step. In normal mode, it would call `process.exit(1)` and stop.

### 3b) Run Tests (if `--test` flag used)

**Lines 262-296**

This is where the most significant difference between wait and normal mode occurs:

#### Normal Mode Output

```typescript
const spawnOptions = { stdio: 'inherit', env: process.env }
```

- `stdio: 'inherit'` means test output goes **directly to the console** in real-time
- User sees every test name, timing, and full output
- This is useful for initial verification

#### Wait Mode Output

```typescript
const spawnOptions = wait ? { encoding: 'utf-8' as const } : { stdio: 'inherit' as const, env: process.env }
```

- `encoding: 'utf-8'` captures **all output into memory** in `result.stdout`
- We can then process and summarize it before displaying

```typescript
if (wait && result.stdout) {
  const output = result.stdout.toString()
  const stats = parseTestSummary(output)  // Extract pass/fail counts
  
  if (stats.hasFailed) {
    // Extract and show failures section
    const failureStart = output.indexOf('✖ failing tests')
    if (failureStart !== -1) {
      const failureSection = output.substring(failureStart)
      console.error(failureSection)  // ← Show ONLY failures
    }
    console.error(`\n❌ Tests failed: ${stats.failed}/${stats.total} failed`)
  } else {
    // All passed: show one-line summary
    console.log(`✅ Tests passed: ${stats.passed} passed`)
  }
}
```

**In wait mode:**
- If all tests pass: `✅ Tests passed: 5 passed` (one line)
- If tests fail: Show failures section + count

**Error handling:**
- Tests failed in wait mode? Continue to markdown generation anyway
- Tests failed in normal mode? Call `process.exit()` and stop

### 3c) Generate Markdown

**Line 299**

```typescript
await generateMarkdown()
```

This always happens, even if typecheck or tests failed. This is crucial for wait mode - we want to regenerate the documentation on every change, even if there are errors.

## 4. Watch Loop: watchFilesAndWait()

**File: `shell.ts` lines 275-353**

This is the heart of the watch mechanism. It waits for either:
1. A file to change, or
2. The user to press spacebar

And returns a Promise that resolves when one of those happens.

### 4a) File Watching - Dependency Collection

**Lines 289-300**

```typescript
const filesToWatch = collectAllDependencies(inputPaths)

const watchers = Array.from(filesToWatch).map(filePath => {
  return watch(filePath, (eventType) => {
    const now = Date.now()
    // Debounce: only consider changes if enough time has passed
    if (now - lastChangeTime >= DEBOUNCE_MS) {
      lastChangeTime = now
      changeDetected = true
    }
  })
})
```

**Key features:**

- **Collects all dependencies**: Not just the input file, but also all files it imports. For example:
  - Input: `file.lit-md.ts`
  - Imports: `./utils.ts`
  - `utils.ts` imports: `./parser.ts`
  - Result: Watch all three files

- **Debouncing**: If a file changes rapidly (like during a save operation that triggers multiple write events), debounce for 300ms to avoid redundant runs

- **Sets flag**: When a change is detected, set `changeDetected = true`

### 4b) Keyboard Listening - Raw Mode

**Lines 316-317**

```typescript
console.error('Press space to regenerate, Ctrl+C to exit...')

process.stdin.setRawMode(true)  // ← Detect individual keypress
process.stdin.resume()
```

- `setRawMode(true)` puts the terminal in "raw mode", allowing detection of individual key presses (not line-buffered)
- This lets us respond immediately to spacebar

### 4c) Return a Promise

**Lines 319-352**

The function returns a Promise that resolves when one of two things happens:

#### Handler 1: Keyboard Input

```typescript
const onData = (data: Buffer) => {
  const char = data[0]
  
  if (char === 0x20) {  // Spacebar (ASCII 0x20)
    cleanup()
    resolve('spacebar')
  } else if (char === 0x03) {  // Ctrl+C (ASCII 0x03)
    cleanup()
    process.exit(0)
  }
}

process.stdin.on('data', onData)
```

- **Spacebar (0x20)**: Clean up and return `'spacebar'`
- **Ctrl+C (0x03)**: Close watchers and exit the process

#### Handler 2: File Changes

```typescript
const checkForChanges = setInterval(() => {
  if (changeDetected) {
    cleanup()
    console.error('Files changed, regenerating...')
    resolve('filechange')
  }
}, 50)
```

- Checks every 50ms if `changeDetected` flag is set
- If yes, clean up and return `'filechange'`

#### Cleanup Function

```typescript
const cleanup = () => {
  process.stdin.off('data', onData)
  clearInterval(checkForChanges)
  process.stdin.setRawMode(false)  // ← Restore normal terminal
  process.stdin.pause()
  process.removeListener('SIGINT', exitHandler)
  process.removeListener('SIGTERM', exitHandler)
  watchers.forEach(w => w.close())  // ← Close file watchers
}
```

Called by either handler to properly clean up before resolving the Promise.

## 5. The Loop Continues

**Back in `cli.ts` lines 307-311**

```typescript
while (true) {
  const trigger = await watchFilesAndWait(inputPaths)  // ← Waits here
  // trigger = 'spacebar' OR 'filechange'
  
  await executeTasks()  // ← Run again!
  // Loop back to watchFilesAndWait()
}
```

After `watchFilesAndWait()` returns, `executeTasks()` is called again, which:
1. Runs typecheck (if enabled)
2. Runs tests with **condensed output** (in wait mode)
3. Generates markdown

Then the loop goes back to waiting for the next change or spacebar press.

## 6. Key Differences: Wait Mode vs Normal Mode

| Aspect | Normal Mode | Wait Mode |
|--------|------------|-----------|
| **Execution** | Run once and exit | Run, then enter watch loop |
| **Test Output** | Show full output | Show condensed summary |
| **On Typecheck Fail** | Exit with error | Print error, continue |
| **On Tests Fail** | Exit with error | Show summary, continue |
| **Target Environment** | CI/CD, one-time runs | Development (iterative) |

## 7. Error Handling in Wait Mode

Unlike normal mode, **errors don't stop the process**:

- **Typecheck fails**: Print error → continue to tests → generate markdown
- **Tests fail**: Print summary + failures → generate markdown

This is by design. In development, you want to keep the process running so you can make edits and regenerate without restarting. The errors are reported, but they don't halt the workflow.

## 8. Test Output Parsing

**`cli.ts` lines 49-70**

```typescript
function parseTestSummary(output: string): { passed: number; failed: number; total: number; hasFailed: boolean } {
  const lines = output.split('\n')
  let stats = { passed: 0, failed: 0, total: 0, hasFailed: false }
  
  for (const line of lines) {
    if (line.includes('ℹ pass')) {
      const match = line.match(/pass\s+(\d+)/)
      if (match) stats.passed = parseInt(match[1])
    }
    if (line.includes('ℹ fail')) {
      const match = line.match(/fail\s+(\d+)/)
      if (match) stats.failed = parseInt(match[1])
    }
    if (line.includes('ℹ tests')) {
      const match = line.match(/tests\s+(\d+)/)
      if (match) stats.total = parseInt(match[1])
    }
  }
  
  stats.hasFailed = stats.failed > 0
  return stats
}
```

This function looks for summary lines in the test output like:

```
ℹ tests 12
ℹ pass 12
ℹ fail 0
```

It extracts the numbers and returns an object with:
- `passed`: Number of passing tests
- `failed`: Number of failing tests
- `total`: Total test count
- `hasFailed`: Boolean to quickly check if there were failures

This is used to decide whether to show a simple summary or the failures section.

## 9. Execution Timeline

```
Start: lit-md --wait --test file.lit-md.ts
   │
   ├─ Extract --wait flag → wait = true
   │
   ├─ First executeTasks() call
   │  ├─ Run tests → Show FULL output (stdio: 'inherit')
   │  └─ Generate markdown
   │
   └─ Check: wait && process.stdin.isTTY? → YES
      │
      └─ Enter watch loop (infinite)
         │
         ├─ await watchFilesAndWait()  ← Waits here
         │  │
         │  ├─ (User presses spacebar)
         │  │  └─ resolve('spacebar')
         │  │
         │  └─ (Or: User edits file.lit-md.ts)
         │     └─ Detect change → resolve('filechange')
         │        Show: "Files changed, regenerating..."
         │
         ├─ Second executeTasks() call
         │  ├─ Run tests → Show CONDENSED output (capture and parse)
         │  │  If all passed: ✅ Tests passed: 5 passed
         │  │  If failed: ❌ Tests failed: 1/5 failed + failures section
         │  └─ Generate markdown
         │
         └─ Loop back to watchFilesAndWait()
            (repeat forever until Ctrl+C)
```

## Summary

The `--wait` mode creates a development-friendly loop:

1. **Initial run**: Execute all tasks with full output for debugging
2. **Watch and wait**: Monitor input files and their dependencies
3. **Responsive to input**: Either file changes (auto-regenerate) or spacebar (manual trigger)
4. **Condensed feedback**: Show test summaries instead of full output during iterations
5. **Resilient to errors**: Keep running even if tests or typecheck fail
6. **Clean exit**: Ctrl+C properly closes watchers and restores terminal

This makes `--wait` ideal for iterative development where you're editing, testing, and regenerating documentation repeatedly.
