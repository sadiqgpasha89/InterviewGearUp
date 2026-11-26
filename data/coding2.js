/* Coding lab, Phase 7: problems for the topics the first set did not cover (linked lists, trees, graphs, queues,
   backtracking, heaps, dynamic programming), plus target complexity and an estimated solving time for every problem.
   JavaScript only for now: these have no starters or solutions in the other editor languages yet, and the lab says so.
   Reference solutions are checked against every test by `npm test`. AI-drafted, not yet reviewed by a person.
   Linked lists and trees are plain JSON objects so tests can describe them: { val, next } and { val, left, right }, null for empty. */
(function () {
  const IGU = window.IGU;
  const C = (o) => Object.assign({ reviewStatus: 'ai-drafted', language: 'javascript', jsOnly: true }, o);
  const list = (a) => a.reduceRight((next, val) => ({ val: val, next: next }), null);

  IGU.codingProblems.push(
    C({ id: 'reverse-linked-list', title: 'Reverse a linked list', topic: 'Linked lists', difficulty: 'easy', fn: 'reverseList',
      statement: 'Given the head of a singly linked list, where each node is `{ val, next }` and the last `next` is `null`, return the head of the reversed list.',
      constraints: ['0 <= number of nodes <= 5000'], examples: [{ input: 'reverseList({val:1,next:{val:2,next:{val:3,next:null}}})', output: '{val:3,next:{val:2,next:{val:1,next:null}}}' }],
      starter: 'function reverseList(head) {\n  // your code here\n}\n',
      tests: [{ args: [list([1, 2, 3, 4, 5])], expected: list([5, 4, 3, 2, 1]) }, { args: [list([1, 2])], expected: list([2, 1]) }, { args: [null], expected: null }, { args: [list([7])], expected: list([7]) }],
      hints: ['You need to turn every `next` pointer around. What do you lose when you overwrite `node.next`?', 'Keep three references while walking: the previous node, the current node and the next node.', 'Start with prev = null; at each step save next, point current.next at prev, then move prev and current forward. Return prev.'],
      solution: { explanation: 'Walk the list once. Before redirecting `current.next` to the previous node, remember the old next node so you can continue. When current becomes null, prev is the new head.',
        complexity: 'Time O(n), space O(1). The recursive version is O(n) space for the call stack.', edgeCases: ['Empty list (null)', 'Single node', 'Two nodes'],
        code: 'function reverseList(head) {\n  let prev = null, cur = head;\n  while (cur) {\n    const next = cur.next;\n    cur.next = prev;\n    prev = cur;\n    cur = next;\n  }\n  return prev;\n}\n' } }),

    C({ id: 'max-depth-tree', title: 'Maximum depth of a binary tree', topic: 'Trees', difficulty: 'easy', fn: 'maxDepth',
      statement: 'Given the root of a binary tree, where each node is `{ val, left, right }` and missing children are `null`, return the number of nodes on the longest path from the root down to a leaf.',
      constraints: ['0 <= number of nodes <= 10000'], examples: [{ input: 'maxDepth({val:3,left:{val:9,left:null,right:null},right:{val:20,left:null,right:null}})', output: '2' }],
      starter: 'function maxDepth(root) {\n  // your code here\n}\n',
      tests: [
        { args: [{ val: 3, left: { val: 9, left: null, right: null }, right: { val: 20, left: { val: 15, left: null, right: null }, right: { val: 7, left: null, right: null } } }], expected: 3 },
        { args: [null], expected: 0 },
        { args: [{ val: 1, left: null, right: null }], expected: 1 },
        { args: [{ val: 1, left: null, right: { val: 2, left: null, right: { val: 3, left: null, right: { val: 4, left: null, right: null } } } }], expected: 4 },
        { args: [{ val: 1, left: { val: 2, left: { val: 4, left: null, right: null }, right: null }, right: { val: 3, left: null, right: null } }], expected: 3 }],
      hints: ['The depth of a tree relates to the depth of its two subtrees. How?', 'Depth(node) = 1 + max(depth(left), depth(right)); an empty tree has depth 0.', 'A very unbalanced tree can make recursion deep; a breadth-first walk that counts levels avoids that.'],
      solution: { explanation: 'Recursively: an empty tree has depth 0, otherwise 1 plus the larger depth of the two children. Iteratively you can count levels in a breadth-first traversal.',
        complexity: 'Time O(n), space O(h) for the recursion, where h is the height (O(n) for a degenerate tree).', edgeCases: ['Empty tree', 'Single node', 'A tree that is a long chain'],
        code: 'function maxDepth(root) {\n  if (!root) return 0;\n  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n}\n' } }),

    C({ id: 'number-of-islands', title: 'Number of islands', topic: 'Graphs', difficulty: 'medium', fn: 'numIslands',
      statement: 'Given a grid of `"1"` (land) and `"0"` (water), return the number of islands. An island is land connected horizontally or vertically; the grid is surrounded by water. Do not change the input grid.',
      constraints: ['0 <= rows, cols <= 300'], examples: [{ input: 'numIslands([["1","1","0"],["0","1","0"],["0","0","1"]])', output: '2' }],
      starter: 'function numIslands(grid) {\n  // your code here\n}\n',
      tests: [
        { args: [[['1', '1', '1', '1', '0'], ['1', '1', '0', '1', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '0', '0', '0']]], expected: 1 },
        { args: [[['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]], expected: 3 },
        { args: [[]], expected: 0 },
        { args: [[['0']]], expected: 0 },
        { args: [[['1', '0', '1', '0', '1']]], expected: 3 },
        { args: [[['1', '0'], ['0', '1']]], expected: 2 }],
      hints: ['Scan every cell. When you find land you have not seen, you have found a new island.', 'From that cell, visit all land connected to it so it is not counted again: depth-first or breadth-first search.', 'Track visited cells in a Set or a copy of the grid, and check bounds before stepping. Diagonals do not connect.'],
      solution: { explanation: 'For each unvisited land cell, increase the count and flood-fill its island with an explicit stack, marking cells as visited. Each cell is visited once.',
        complexity: 'Time O(rows x cols), space O(rows x cols) for the visited set and stack.', edgeCases: ['Empty grid', 'All water', 'Diagonal neighbours are separate islands', 'One long row'],
        code: 'function numIslands(grid) {\n  const seen = new Set();\n  let count = 0;\n  for (let r = 0; r < grid.length; r++) {\n    for (let c = 0; c < grid[r].length; c++) {\n      if (grid[r][c] !== "1" || seen.has(r + "," + c)) continue;\n      count++;\n      const stack = [[r, c]];\n      seen.add(r + "," + c);\n      while (stack.length) {\n        const [y, x] = stack.pop();\n        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {\n          const ny = y + dy, nx = x + dx, key = ny + "," + nx;\n          if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[ny].length && grid[ny][nx] === "1" && !seen.has(key)) {\n            seen.add(key);\n            stack.push([ny, nx]);\n          }\n        }\n      }\n    }\n  }\n  return count;\n}\n' } }),

    C({ id: 'course-schedule', title: 'Course schedule', topic: 'Graphs and queues', difficulty: 'medium', fn: 'canFinish',
      statement: 'There are `n` courses numbered 0 to n - 1. `prerequisites[i] = [a, b]` means you must take course `b` before course `a`. Return `true` if you can finish every course, or `false` if the prerequisites contain a cycle.',
      constraints: ['1 <= n <= 2000', '0 <= prerequisites.length <= 5000'], examples: [{ input: 'canFinish(2, [[1, 0]])', output: 'true' }, { input: 'canFinish(2, [[1, 0], [0, 1]])', output: 'false' }],
      starter: 'function canFinish(n, prerequisites) {\n  // your code here\n}\n',
      tests: [{ args: [2, [[1, 0]]], expected: true }, { args: [2, [[1, 0], [0, 1]]], expected: false }, { args: [1, []], expected: true }, { args: [4, [[1, 0], [2, 1], [3, 2]]], expected: true },
        { args: [3, [[0, 1], [1, 2], [2, 0]]], expected: false }, { args: [3, [[0, 0]]], expected: false }, { args: [5, [[1, 0], [2, 0], [3, 1], [3, 2], [4, 3]]], expected: true }],
      hints: ['Model courses as nodes and prerequisites as directed edges. What does an impossible schedule look like in that graph?', 'Count incoming edges for each course. Courses with no prerequisites can be taken first; use a queue.', 'Each time you take a course, lower the in-degree of the courses that depend on it. If you take all n courses there is no cycle (Kahn\'s algorithm).'],
      solution: { explanation: 'Build an adjacency list and in-degree counts. Put every course with in-degree 0 in a queue, repeatedly take one, and reduce the in-degree of its dependants, queueing any that reach 0. If the number taken equals n, there is no cycle.',
        complexity: 'Time O(n + e), space O(n + e) for e prerequisites.', edgeCases: ['No prerequisites', 'A course that requires itself', 'A long chain', 'Several independent components'],
        code: 'function canFinish(n, prerequisites) {\n  const indeg = new Array(n).fill(0);\n  const next = Array.from({ length: n }, () => []);\n  for (const [a, b] of prerequisites) { next[b].push(a); indeg[a]++; }\n  const queue = [];\n  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);\n  let taken = 0;\n  for (let head = 0; head < queue.length; head++) {\n    taken++;\n    for (const c of next[queue[head]]) if (--indeg[c] === 0) queue.push(c);\n  }\n  return taken === n;\n}\n' } }),

    C({ id: 'generate-parentheses', title: 'Generate parentheses', topic: 'Recursion and backtracking', difficulty: 'medium', fn: 'generateParenthesis',
      statement: 'Given `n`, return every string of `n` pairs of well-formed parentheses, sorted in ascending order (where `(` comes before `)`).',
      constraints: ['0 <= n <= 8'], examples: [{ input: 'generateParenthesis(2)', output: '["(())", "()()"]' }],
      starter: 'function generateParenthesis(n) {\n  // your code here\n}\n',
      tests: [{ args: [1], expected: ['()'] }, { args: [2], expected: ['(())', '()()'] }, { args: [3], expected: ['((()))', '(()())', '(())()', '()(())', '()()()'] }, { args: [0], expected: [''] }, { args: [4], expected: ['(((())))', '((()()))', '((())())', '((()))()', '(()(()))', '(()()())', '(()())()', '(())(())', '(())()()', '()((()))', '()(()())', '()(())()', '()()(())', '()()()()'] }],
      hints: ['Build the string one character at a time. When is adding "(" allowed? When is adding ")" allowed?', 'You may add "(" while you have used fewer than n, and ")" while it would not close more than you opened.', 'Try "(" before ")" at each step and the results come out already sorted; no need to generate all 2^(2n) strings.'],
      solution: { explanation: 'Backtrack with counts of open and close brackets used. Add "(" if open < n, add ")" if close < open, and record the string when its length is 2n. Trying "(" first yields sorted output.',
        complexity: 'Time and space proportional to the number of results, the nth Catalan number (about 4^n / n^1.5), times n for building strings.', edgeCases: ['n = 0 gives one empty string', 'Never close more than you opened'],
        code: 'function generateParenthesis(n) {\n  const out = [];\n  (function go(s, open, close) {\n    if (s.length === 2 * n) { out.push(s); return; }\n    if (open < n) go(s + "(", open + 1, close);\n    if (close < open) go(s + ")", open, close + 1);\n  })("", 0, 0);\n  return out;\n}\n' } }),

    C({ id: 'kth-largest', title: 'Kth largest element', topic: 'Heaps', difficulty: 'medium', fn: 'findKthLargest',
      statement: 'Return the `k`th largest element of the unsorted array `nums` (the kth largest in sorted order, not the kth distinct). Aim to do better than sorting the whole array.',
      constraints: ['1 <= k <= nums.length <= 100000'], examples: [{ input: 'findKthLargest([3, 2, 1, 5, 6, 4], 2)', output: '5' }],
      starter: 'function findKthLargest(nums, k) {\n  // your code here\n}\n',
      tests: [{ args: [[3, 2, 1, 5, 6, 4], 2], expected: 5 }, { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 }, { args: [[1], 1], expected: 1 }, { args: [[-1, -1], 2], expected: -1 }, { args: [[7, 6, 5, 4, 3, 2, 1], 7], expected: 1 }],
      hints: ['Sorting works in O(n log n). Can you keep only the k largest values seen so far?', 'A min-heap of size k keeps the k largest; its smallest element is the answer.', 'JavaScript has no built-in heap: store it in an array with sift-up and sift-down. Quickselect is another option with average O(n).'],
      solution: { explanation: 'Keep a min-heap of at most k values. Push each number; when the heap grows past k, pop the smallest. After the scan, the heap top is the kth largest.',
        complexity: 'Time O(n log k), space O(k). Quickselect averages O(n) time but has an O(n^2) worst case.', edgeCases: ['Duplicates count separately', 'k equals the array length', 'Negative numbers'],
        code: 'function findKthLargest(nums, k) {\n  const heap = [];\n  const swap = (i, j) => { const t = heap[i]; heap[i] = heap[j]; heap[j] = t; };\n  const push = (v) => {\n    heap.push(v);\n    let i = heap.length - 1;\n    while (i > 0 && heap[(i - 1) >> 1] > heap[i]) { swap(i, (i - 1) >> 1); i = (i - 1) >> 1; }\n  };\n  const pop = () => {\n    const last = heap.pop();\n    if (!heap.length) return;\n    heap[0] = last;\n    let i = 0;\n    for (;;) {\n      const l = 2 * i + 1, r = l + 1;\n      let m = i;\n      if (l < heap.length && heap[l] < heap[m]) m = l;\n      if (r < heap.length && heap[r] < heap[m]) m = r;\n      if (m === i) break;\n      swap(i, m); i = m;\n    }\n  };\n  for (const n of nums) { push(n); if (heap.length > k) pop(); }\n  return heap[0];\n}\n' } }),

    C({ id: 'coin-change', title: 'Coin change', topic: 'Dynamic programming', difficulty: 'medium', fn: 'coinChange',
      statement: 'Given coin denominations `coins` (unlimited supply of each) and an `amount`, return the fewest coins that add up to `amount`, or `-1` if it cannot be made.',
      constraints: ['1 <= coins.length <= 12', '0 <= amount <= 10000'], examples: [{ input: 'coinChange([1, 2, 5], 11)', output: '3' }],
      starter: 'function coinChange(coins, amount) {\n  // your code here\n}\n',
      tests: [{ args: [[1, 2, 5], 11], expected: 3 }, { args: [[2], 3], expected: -1 }, { args: [[1], 0], expected: 0 }, { args: [[1, 3, 4], 6], expected: 2 }, { args: [[186, 419, 83, 408], 6249], expected: 20 }, { args: [[5, 10], 1], expected: -1 }],
      hints: ['Greedy (always take the largest coin) fails for coins [1, 3, 4] and amount 6. Why?', 'Let best[a] be the fewest coins for amount a. How does best[a] relate to smaller amounts?', 'best[0] = 0 and best[a] = 1 + min over coins c <= a of best[a - c]. Fill amounts from 1 upwards; unreachable amounts stay Infinity.'],
      solution: { explanation: 'Bottom-up dynamic programming over amounts 0 to amount. For each amount try every coin and keep the minimum of 1 + best[amount - coin]. If best[amount] is still Infinity, return -1.',
        complexity: 'Time O(amount x coins), space O(amount).', edgeCases: ['Amount 0 needs 0 coins', 'No combination works', 'Greedy choice is not optimal'],
        code: 'function coinChange(coins, amount) {\n  const best = new Array(amount + 1).fill(Infinity);\n  best[0] = 0;\n  for (let a = 1; a <= amount; a++) {\n    for (const c of coins) {\n      if (c <= a && best[a - c] + 1 < best[a]) best[a] = best[a - c] + 1;\n    }\n  }\n  return best[amount] === Infinity ? -1 : best[amount];\n}\n' } })
  );

  /* Target complexity and an estimated solving time (minutes, including explaining it aloud) for every problem. */
  const META = {
    'two-sum': ['O(n) time, O(n) space', 15], 'valid-parentheses': ['O(n) time, O(n) space', 15], 'merge-intervals': ['O(n log n) time, O(n) space', 25],
    'longest-unique-substring': ['O(n) time, O(k) space', 25], 'binary-search': ['O(log n) time, O(1) space', 10], 'flatten-array': ['O(n) time, O(n) space', 15],
    'top-k-frequent': ['Better than O(n log n) time', 25], 'valid-palindrome': ['O(n) time, O(1) space', 10],
    'reverse-linked-list': ['O(n) time, O(1) space', 15], 'max-depth-tree': ['O(n) time, O(h) space', 10], 'number-of-islands': ['O(rows x cols) time', 25],
    'course-schedule': ['O(n + e) time and space', 30], 'generate-parentheses': ['Proportional to the number of results', 25], 'kth-largest': ['O(n log k) time, O(k) space', 25],
    'coin-change': ['O(amount x coins) time, O(amount) space', 30]
  };
  IGU.codingProblems.forEach(function (p) { const m = META[p.id]; if (m) { p.target = m[0]; p.minutes = m[1]; } });
})();
