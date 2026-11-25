/* Coding lab: starters and reference solutions in other languages.
   JavaScript stays the only language the lab can run (isolated worker). Everything here is editor-only practice plus a
   "Show solution" view in the learner's chosen language. AI-drafted, not yet reviewed by a person.
   TypeScript (strict), Python, Java, C++ and Go solutions were compiled and run against the same tests as the JavaScript
   reference when they were written. The C# solutions could not be compiled in that environment and are untested.
   Java, Go and C# take any leaf value for the nested-array problem; C++ takes ints only. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  IGU.codingLanguages = [
    { id: 'javascript', label: 'JavaScript', runnable: true },
    { id: 'typescript', label: 'TypeScript', runnable: false },
    { id: 'python', label: 'Python', runnable: false },
    { id: 'java', label: 'Java', runnable: false },
    { id: 'cpp', label: 'C++', runnable: false },
    { id: 'go', label: 'Go', runnable: false },
    { id: 'csharp', label: 'C#', runnable: false }
  ];

  /* problem id -> language id -> { starter, code } */
  IGU.codingLangs = {
    'two-sum': {
      typescript: {
        starter: 'function twoSum(nums: number[], target: number): number[] {\n  // your code here\n  return [];\n}\n',
        code: 'function twoSum(nums: number[], target: number): number[] {\n  const seen = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const j = seen.get(target - nums[i]);\n    if (j !== undefined) return [j, i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}\n'
      },
      python: {
        starter: 'def two_sum(nums: list[int], target: int) -> list[int]:\n    # your code here\n    pass\n',
        code: 'def two_sum(nums: list[int], target: int) -> list[int]:\n    seen = {}  # value -> index\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []\n'
      },
      java: {
        starter: 'import java.util.*;\n\nclass Solution {\n    public static int[] twoSum(int[] nums, int target) {\n        // your code here\n        return new int[0];\n    }\n}\n',
        code: 'import java.util.*;\n\nclass Solution {\n    public static int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            Integer j = seen.get(target - nums[i]);\n            if (j != null) return new int[] { j, i };\n            seen.put(nums[i], i);\n        }\n        return new int[0];\n    }\n}\n'
      },
      cpp: {
        starter: '#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(const vector<int>& nums, int target) {\n    // your code here\n    return {};\n}\n',
        code: '#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(const vector<int>& nums, int target) {\n    unordered_map<int, int> seen;  // value -> index\n    for (int i = 0; i < (int)nums.size(); i++) {\n        auto it = seen.find(target - nums[i]);\n        if (it != seen.end()) return {it->second, i};\n        seen[nums[i]] = i;\n    }\n    return {};\n}\n'
      },
      go: {
        starter: 'package main\n\nfunc twoSum(nums []int, target int) []int {\n\t// your code here\n\treturn nil\n}\n',
        code: 'package main\n\nfunc twoSum(nums []int, target int) []int {\n\tseen := make(map[int]int) // value -> index\n\tfor i, n := range nums {\n\t\tif j, ok := seen[target-n]; ok {\n\t\t\treturn []int{j, i}\n\t\t}\n\t\tseen[n] = i\n\t}\n\treturn nil\n}\n'
      },
      csharp: {
        starter: 'using System.Collections.Generic;\n\npublic static class Solution\n{\n    public static int[] TwoSum(int[] nums, int target)\n    {\n        // your code here\n        return new int[0];\n    }\n}\n',
        code: 'using System.Collections.Generic;\n\npublic static class Solution\n{\n    public static int[] TwoSum(int[] nums, int target)\n    {\n        var seen = new Dictionary<int, int>(); // value -> index\n        for (int i = 0; i < nums.Length; i++)\n        {\n            if (seen.TryGetValue(target - nums[i], out int j)) return new[] { j, i };\n            seen[nums[i]] = i;\n        }\n        return new int[0];\n    }\n}\n'
      }
    },

    'valid-parentheses': {
      typescript: {
        starter: 'function isValid(s: string): boolean {\n  // your code here\n  return false;\n}\n',
        code: 'function isValid(s: string): boolean {\n  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };\n  const stack: string[] = [];\n  for (const c of s) {\n    if (c in pairs) {\n      if (stack.pop() !== pairs[c]) return false;\n    } else {\n      stack.push(c);\n    }\n  }\n  return stack.length === 0;\n}\n'
      },
      python: {
        starter: 'def is_valid(s: str) -> bool:\n    # your code here\n    pass\n',
        code: 'def is_valid(s: str) -> bool:\n    pairs = {")": "(", "]": "[", "}": "{"}\n    stack = []\n    for c in s:\n        if c in pairs:\n            if not stack or stack.pop() != pairs[c]:\n                return False\n        else:\n            stack.append(c)\n    return not stack\n'
      },
      java: {
        starter: 'import java.util.*;\n\nclass Solution {\n    public static boolean isValid(String s) {\n        // your code here\n        return false;\n    }\n}\n',
        code: 'import java.util.*;\n\nclass Solution {\n    public static boolean isValid(String s) {\n        Map<Character, Character> pairs = Map.of(\')\', \'(\', \']\', \'[\', \'}\', \'{\');\n        Deque<Character> stack = new ArrayDeque<>();\n        for (char c : s.toCharArray()) {\n            if (pairs.containsKey(c)) {\n                if (stack.isEmpty() || stack.pop() != pairs.get(c)) return false;\n            } else {\n                stack.push(c);\n            }\n        }\n        return stack.isEmpty();\n    }\n}\n'
      },
      cpp: {
        starter: '#include <string>\nusing namespace std;\n\nbool isValid(const string& s) {\n    // your code here\n    return false;\n}\n',
        code: '#include <string>\n#include <vector>\nusing namespace std;\n\nbool isValid(const string& s) {\n    vector<char> stack;\n    for (char c : s) {\n        if (c == \'(\' || c == \'[\' || c == \'{\') {\n            stack.push_back(c);\n        } else {\n            if (stack.empty()) return false;\n            char open = stack.back();\n            stack.pop_back();\n            if ((c == \')\' && open != \'(\') || (c == \']\' && open != \'[\') || (c == \'}\' && open != \'{\')) return false;\n        }\n    }\n    return stack.empty();\n}\n'
      },
      go: {
        starter: 'package main\n\nfunc isValid(s string) bool {\n\t// your code here\n\treturn false\n}\n',
        code: 'package main\n\nfunc isValid(s string) bool {\n\tpairs := map[rune]rune{\')\': \'(\', \']\': \'[\', \'}\': \'{\'}\n\tvar stack []rune\n\tfor _, c := range s {\n\t\tif open, isCloser := pairs[c]; isCloser {\n\t\t\tif len(stack) == 0 || stack[len(stack)-1] != open {\n\t\t\t\treturn false\n\t\t\t}\n\t\t\tstack = stack[:len(stack)-1]\n\t\t} else {\n\t\t\tstack = append(stack, c)\n\t\t}\n\t}\n\treturn len(stack) == 0\n}\n'
      },
      csharp: {
        starter: 'public static class Solution\n{\n    public static bool IsValid(string s)\n    {\n        // your code here\n        return false;\n    }\n}\n',
        code: 'using System.Collections.Generic;\n\npublic static class Solution\n{\n    public static bool IsValid(string s)\n    {\n        var pairs = new Dictionary<char, char> { { \')\', \'(\' }, { \']\', \'[\' }, { \'}\', \'{\' } };\n        var stack = new Stack<char>();\n        foreach (char c in s)\n        {\n            if (pairs.TryGetValue(c, out char open))\n            {\n                if (stack.Count == 0 || stack.Pop() != open) return false;\n            }\n            else\n            {\n                stack.Push(c);\n            }\n        }\n        return stack.Count == 0;\n    }\n}\n'
      }
    },

    'merge-intervals': {
      typescript: {
        starter: 'function merge(intervals: number[][]): number[][] {\n  // your code here\n  return [];\n}\n',
        code: 'function merge(intervals: number[][]): number[][] {\n  const sorted = intervals.map((i) => [i[0], i[1]]).sort((a, b) => a[0] - b[0]);\n  const out: number[][] = [];\n  for (const cur of sorted) {\n    const last = out[out.length - 1];\n    if (last && cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);\n    else out.push(cur);\n  }\n  return out;\n}\n'
      },
      python: {
        starter: 'def merge(intervals: list[list[int]]) -> list[list[int]]:\n    # your code here\n    pass\n',
        code: 'def merge(intervals: list[list[int]]) -> list[list[int]]:\n    out: list[list[int]] = []\n    for start, end in sorted(intervals, key=lambda i: i[0]):\n        if out and start <= out[-1][1]:\n            out[-1][1] = max(out[-1][1], end)\n        else:\n            out.append([start, end])\n    return out\n'
      },
      java: {
        starter: 'import java.util.*;\n\nclass Solution {\n    public static int[][] merge(int[][] intervals) {\n        // your code here\n        return new int[0][];\n    }\n}\n',
        code: 'import java.util.*;\n\nclass Solution {\n    public static int[][] merge(int[][] intervals) {\n        int[][] sorted = new int[intervals.length][];\n        for (int i = 0; i < intervals.length; i++) sorted[i] = intervals[i].clone();\n        Arrays.sort(sorted, (a, b) -> Integer.compare(a[0], b[0]));\n        List<int[]> out = new ArrayList<>();\n        for (int[] cur : sorted) {\n            if (!out.isEmpty() && cur[0] <= out.get(out.size() - 1)[1]) {\n                int[] last = out.get(out.size() - 1);\n                last[1] = Math.max(last[1], cur[1]);\n            } else {\n                out.add(cur);\n            }\n        }\n        return out.toArray(new int[0][]);\n    }\n}\n'
      },
      cpp: {
        starter: '#include <vector>\nusing namespace std;\n\nvector<vector<int>> merge(vector<vector<int>> intervals) {\n    // your code here\n    return {};\n}\n',
        code: '#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvector<vector<int>> merge(vector<vector<int>> intervals) {\n    sort(intervals.begin(), intervals.end(),\n         [](const vector<int>& a, const vector<int>& b) { return a[0] < b[0]; });\n    vector<vector<int>> out;\n    for (const auto& cur : intervals) {\n        if (!out.empty() && cur[0] <= out.back()[1]) out.back()[1] = max(out.back()[1], cur[1]);\n        else out.push_back(cur);\n    }\n    return out;\n}\n'
      },
      go: {
        starter: 'package main\n\nfunc merge(intervals [][]int) [][]int {\n\t// your code here\n\treturn nil\n}\n',
        code: 'package main\n\nimport "sort"\n\nfunc merge(intervals [][]int) [][]int {\n\tsorted := make([][]int, len(intervals))\n\tfor i, iv := range intervals {\n\t\tsorted[i] = []int{iv[0], iv[1]}\n\t}\n\tsort.Slice(sorted, func(a, b int) bool { return sorted[a][0] < sorted[b][0] })\n\tout := [][]int{}\n\tfor _, cur := range sorted {\n\t\tif n := len(out); n > 0 && cur[0] <= out[n-1][1] {\n\t\t\tif cur[1] > out[n-1][1] {\n\t\t\t\tout[n-1][1] = cur[1]\n\t\t\t}\n\t\t} else {\n\t\t\tout = append(out, cur)\n\t\t}\n\t}\n\treturn out\n}\n'
      },
      csharp: {
        starter: 'public static class Solution\n{\n    public static int[][] Merge(int[][] intervals)\n    {\n        // your code here\n        return new int[0][];\n    }\n}\n',
        code: 'using System;\nusing System.Collections.Generic;\nusing System.Linq;\n\npublic static class Solution\n{\n    public static int[][] Merge(int[][] intervals)\n    {\n        var sorted = intervals.Select(i => new[] { i[0], i[1] }).OrderBy(i => i[0]).ToList();\n        var output = new List<int[]>();\n        foreach (var cur in sorted)\n        {\n            if (output.Count > 0 && cur[0] <= output[^1][1])\n                output[^1][1] = Math.Max(output[^1][1], cur[1]);\n            else\n                output.Add(cur);\n        }\n        return output.ToArray();\n    }\n}\n'
      }
    },

    'longest-unique-substring': {
      typescript: {
        starter: 'function lengthOfLongestSubstring(s: string): number {\n  // your code here\n  return 0;\n}\n',
        code: 'function lengthOfLongestSubstring(s: string): number {\n  const last = new Map<string, number>();\n  let left = 0;\n  let best = 0;\n  for (let right = 0; right < s.length; right++) {\n    const c = s[right];\n    const seenAt = last.get(c);\n    if (seenAt !== undefined && seenAt >= left) left = seenAt + 1;\n    last.set(c, right);\n    best = Math.max(best, right - left + 1);\n  }\n  return best;\n}\n'
      },
      python: {
        starter: 'def length_of_longest_substring(s: str) -> int:\n    # your code here\n    pass\n',
        code: 'def length_of_longest_substring(s: str) -> int:\n    last = {}  # char -> most recent index\n    left = best = 0\n    for right, c in enumerate(s):\n        if c in last and last[c] >= left:\n            left = last[c] + 1\n        last[c] = right\n        best = max(best, right - left + 1)\n    return best\n'
      },
      java: {
        starter: 'import java.util.*;\n\nclass Solution {\n    public static int lengthOfLongestSubstring(String s) {\n        // your code here\n        return 0;\n    }\n}\n',
        code: 'import java.util.*;\n\nclass Solution {\n    public static int lengthOfLongestSubstring(String s) {\n        Map<Character, Integer> last = new HashMap<>();\n        int left = 0, best = 0;\n        for (int right = 0; right < s.length(); right++) {\n            char c = s.charAt(right);\n            Integer seenAt = last.get(c);\n            if (seenAt != null && seenAt >= left) left = seenAt + 1;\n            last.put(c, right);\n            best = Math.max(best, right - left + 1);\n        }\n        return best;\n    }\n}\n'
      },
      cpp: {
        starter: '#include <string>\nusing namespace std;\n\nint lengthOfLongestSubstring(const string& s) {\n    // your code here\n    return 0;\n}\n',
        code: '#include <string>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nint lengthOfLongestSubstring(const string& s) {\n    unordered_map<char, int> last;  // char -> most recent index\n    int left = 0, best = 0;\n    for (int right = 0; right < (int)s.size(); right++) {\n        auto it = last.find(s[right]);\n        if (it != last.end() && it->second >= left) left = it->second + 1;\n        last[s[right]] = right;\n        best = max(best, right - left + 1);\n    }\n    return best;\n}\n'
      },
      go: {
        starter: 'package main\n\nfunc lengthOfLongestSubstring(s string) int {\n\t// your code here\n\treturn 0\n}\n',
        code: 'package main\n\nfunc lengthOfLongestSubstring(s string) int {\n\tlast := make(map[rune]int) // rune -> most recent index\n\tleft, best := 0, 0\n\tfor right, c := range []rune(s) {\n\t\tif at, ok := last[c]; ok && at >= left {\n\t\t\tleft = at + 1\n\t\t}\n\t\tlast[c] = right\n\t\tif right-left+1 > best {\n\t\t\tbest = right - left + 1\n\t\t}\n\t}\n\treturn best\n}\n'
      },
      csharp: {
        starter: 'public static class Solution\n{\n    public static int LengthOfLongestSubstring(string s)\n    {\n        // your code here\n        return 0;\n    }\n}\n',
        code: 'using System;\nusing System.Collections.Generic;\n\npublic static class Solution\n{\n    public static int LengthOfLongestSubstring(string s)\n    {\n        var last = new Dictionary<char, int>(); // char -> most recent index\n        int left = 0, best = 0;\n        for (int right = 0; right < s.Length; right++)\n        {\n            if (last.TryGetValue(s[right], out int at) && at >= left) left = at + 1;\n            last[s[right]] = right;\n            best = Math.Max(best, right - left + 1);\n        }\n        return best;\n    }\n}\n'
      }
    },

    'binary-search': {
      typescript: {
        starter: 'function search(nums: number[], target: number): number {\n  // your code here\n  return -1;\n}\n',
        code: 'function search(nums: number[], target: number): number {\n  let lo = 0;\n  let hi = nums.length - 1;\n  while (lo <= hi) {\n    const mid = lo + Math.floor((hi - lo) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}\n'
      },
      python: {
        starter: 'def search(nums: list[int], target: int) -> int:\n    # your code here\n    pass\n',
        code: 'def search(nums: list[int], target: int) -> int:\n    lo, hi = 0, len(nums) - 1\n    while lo <= hi:\n        mid = lo + (hi - lo) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n'
      },
      java: {
        starter: 'class Solution {\n    public static int search(int[] nums, int target) {\n        // your code here\n        return -1;\n    }\n}\n',
        code: 'class Solution {\n    public static int search(int[] nums, int target) {\n        int lo = 0, hi = nums.length - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;  // avoids int overflow of lo + hi\n            if (nums[mid] == target) return mid;\n            if (nums[mid] < target) lo = mid + 1;\n            else hi = mid - 1;\n        }\n        return -1;\n    }\n}\n'
      },
      cpp: {
        starter: '#include <vector>\nusing namespace std;\n\nint search(const vector<int>& nums, int target) {\n    // your code here\n    return -1;\n}\n',
        code: '#include <vector>\nusing namespace std;\n\nint search(const vector<int>& nums, int target) {\n    int lo = 0, hi = (int)nums.size() - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;  // avoids int overflow of lo + hi\n        if (nums[mid] == target) return mid;\n        if (nums[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}\n'
      },
      go: {
        starter: 'package main\n\nfunc search(nums []int, target int) int {\n\t// your code here\n\treturn -1\n}\n',
        code: 'package main\n\nfunc search(nums []int, target int) int {\n\tlo, hi := 0, len(nums)-1\n\tfor lo <= hi {\n\t\tmid := lo + (hi-lo)/2 // avoids overflow of lo + hi\n\t\tif nums[mid] == target {\n\t\t\treturn mid\n\t\t}\n\t\tif nums[mid] < target {\n\t\t\tlo = mid + 1\n\t\t} else {\n\t\t\thi = mid - 1\n\t\t}\n\t}\n\treturn -1\n}\n'
      },
      csharp: {
        starter: 'public static class Solution\n{\n    public static int Search(int[] nums, int target)\n    {\n        // your code here\n        return -1;\n    }\n}\n',
        code: 'public static class Solution\n{\n    public static int Search(int[] nums, int target)\n    {\n        int lo = 0, hi = nums.Length - 1;\n        while (lo <= hi)\n        {\n            int mid = lo + (hi - lo) / 2; // avoids int overflow of lo + hi\n            if (nums[mid] == target) return mid;\n            if (nums[mid] < target) lo = mid + 1;\n            else hi = mid - 1;\n        }\n        return -1;\n    }\n}\n'
      }
    },

    'flatten-array': {
      typescript: {
        starter: 'type Nested = number | string | Nested[];\n\nfunction flatten(arr: Nested[]): (number | string)[] {\n  // your code here\n  return [];\n}\n',
        code: 'type Nested = number | string | Nested[];\n\nfunction flatten(arr: Nested[]): (number | string)[] {\n  const out: (number | string)[] = [];\n  const walk = (a: Nested[]): void => {\n    for (const x of a) {\n      if (Array.isArray(x)) walk(x);\n      else out.push(x);\n    }\n  };\n  walk(arr);\n  return out;\n}\n'
      },
      python: {
        starter: 'def flatten(arr: list) -> list:\n    # your code here\n    pass\n',
        code: 'def flatten(arr: list) -> list:\n    out = []\n\n    def walk(a: list) -> None:\n        for x in a:\n            if isinstance(x, list):\n                walk(x)\n            else:\n                out.append(x)\n\n    walk(arr)\n    return out\n'
      },
      java: {
        starter: 'import java.util.*;\n\nclass Solution {\n    // Elements are either a nested List<?> or a leaf value (for example an Integer).\n    public static List<Object> flatten(List<?> arr) {\n        // your code here\n        return new ArrayList<>();\n    }\n}\n',
        code: 'import java.util.*;\n\nclass Solution {\n    // Elements are either a nested List<?> or a leaf value (for example an Integer).\n    public static List<Object> flatten(List<?> arr) {\n        List<Object> out = new ArrayList<>();\n        walk(arr, out);\n        return out;\n    }\n\n    private static void walk(List<?> a, List<Object> out) {\n        for (Object x : a) {\n            if (x instanceof List<?>) walk((List<?>) x, out);\n            else out.add(x);\n        }\n    }\n}\n'
      },
      cpp: {
        starter: '#include <vector>\nusing namespace std;\n\n// A node is either a single int or a list of nodes.\nstruct Nested {\n    bool isInt = false;\n    int value = 0;\n    vector<Nested> list;\n};\n\nvector<int> flatten(const Nested& root) {\n    // your code here\n    return {};\n}\n',
        code: '#include <vector>\nusing namespace std;\n\n// A node is either a single int or a list of nodes.\nstruct Nested {\n    bool isInt = false;\n    int value = 0;\n    vector<Nested> list;\n};\n\nstatic void walk(const Nested& n, vector<int>& out) {\n    if (n.isInt) { out.push_back(n.value); return; }\n    for (const Nested& child : n.list) walk(child, out);\n}\n\nvector<int> flatten(const Nested& root) {\n    vector<int> out;\n    walk(root, out);\n    return out;\n}\n'
      },
      go: {
        starter: 'package main\n\n// Each element is either a []interface{} (a nested list) or a leaf value.\nfunc flatten(arr []interface{}) []interface{} {\n\t// your code here\n\treturn nil\n}\n',
        code: 'package main\n\n// Each element is either a []interface{} (a nested list) or a leaf value.\nfunc flatten(arr []interface{}) []interface{} {\n\tout := []interface{}{}\n\tvar walk func(a []interface{})\n\twalk = func(a []interface{}) {\n\t\tfor _, x := range a {\n\t\t\tif nested, ok := x.([]interface{}); ok {\n\t\t\t\twalk(nested)\n\t\t\t} else {\n\t\t\t\tout = append(out, x)\n\t\t\t}\n\t\t}\n\t}\n\twalk(arr)\n\treturn out\n}\n'
      },
      csharp: {
        starter: 'using System.Collections;\nusing System.Collections.Generic;\n\npublic static class Solution\n{\n    // Elements are either a nested IEnumerable (a list) or a leaf value. A string is a leaf.\n    public static List<object> Flatten(IEnumerable arr)\n    {\n        // your code here\n        return new List<object>();\n    }\n}\n',
        code: 'using System.Collections;\nusing System.Collections.Generic;\n\npublic static class Solution\n{\n    // Elements are either a nested IEnumerable (a list) or a leaf value. A string is a leaf.\n    public static List<object> Flatten(IEnumerable arr)\n    {\n        var output = new List<object>();\n        Walk(arr, output);\n        return output;\n    }\n\n    private static void Walk(IEnumerable a, List<object> output)\n    {\n        foreach (object x in a)\n        {\n            if (x is IEnumerable nested && !(x is string)) Walk(nested, output);\n            else output.Add(x);\n        }\n    }\n}\n'
      }
    },

    'top-k-frequent': {
      typescript: {
        starter: 'function topKFrequent(nums: number[], k: number): number[] {\n  // your code here\n  return [];\n}\n',
        code: 'function topKFrequent(nums: number[], k: number): number[] {\n  const count = new Map<number, number>();\n  for (const n of nums) count.set(n, (count.get(n) ?? 0) + 1);\n  return [...count.entries()]\n    .sort((a, b) => b[1] - a[1])\n    .slice(0, k)\n    .map((e) => e[0])\n    .sort((a, b) => a - b);\n}\n'
      },
      python: {
        starter: 'def top_k_frequent(nums: list[int], k: int) -> list[int]:\n    # your code here\n    pass\n',
        code: 'from collections import Counter\n\n\ndef top_k_frequent(nums: list[int], k: int) -> list[int]:\n    top = Counter(nums).most_common(k)  # [(value, count), ...] by count desc\n    return sorted(value for value, _ in top)\n'
      },
      java: {
        starter: 'import java.util.*;\n\nclass Solution {\n    public static int[] topKFrequent(int[] nums, int k) {\n        // your code here\n        return new int[0];\n    }\n}\n',
        code: 'import java.util.*;\n\nclass Solution {\n    public static int[] topKFrequent(int[] nums, int k) {\n        Map<Integer, Integer> count = new HashMap<>();\n        for (int n : nums) count.merge(n, 1, Integer::sum);\n        List<Map.Entry<Integer, Integer>> entries = new ArrayList<>(count.entrySet());\n        entries.sort((a, b) -> b.getValue() - a.getValue());\n        int[] out = new int[k];\n        for (int i = 0; i < k; i++) out[i] = entries.get(i).getKey();\n        Arrays.sort(out);\n        return out;\n    }\n}\n'
      },
      cpp: {
        starter: '#include <vector>\nusing namespace std;\n\nvector<int> topKFrequent(const vector<int>& nums, int k) {\n    // your code here\n    return {};\n}\n',
        code: '#include <vector>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nvector<int> topKFrequent(const vector<int>& nums, int k) {\n    unordered_map<int, int> count;\n    for (int n : nums) count[n]++;\n    vector<pair<int, int>> entries(count.begin(), count.end());  // (value, count)\n    sort(entries.begin(), entries.end(),\n         [](const pair<int, int>& a, const pair<int, int>& b) { return a.second > b.second; });\n    vector<int> out;\n    for (int i = 0; i < k; i++) out.push_back(entries[i].first);\n    sort(out.begin(), out.end());\n    return out;\n}\n'
      },
      go: {
        starter: 'package main\n\nfunc topKFrequent(nums []int, k int) []int {\n\t// your code here\n\treturn nil\n}\n',
        code: 'package main\n\nimport "sort"\n\nfunc topKFrequent(nums []int, k int) []int {\n\tcount := make(map[int]int)\n\tfor _, n := range nums {\n\t\tcount[n]++\n\t}\n\tvalues := make([]int, 0, len(count))\n\tfor v := range count {\n\t\tvalues = append(values, v)\n\t}\n\tsort.Slice(values, func(a, b int) bool { return count[values[a]] > count[values[b]] })\n\tout := append([]int{}, values[:k]...)\n\tsort.Ints(out)\n\treturn out\n}\n'
      },
      csharp: {
        starter: 'public static class Solution\n{\n    public static int[] TopKFrequent(int[] nums, int k)\n    {\n        // your code here\n        return new int[0];\n    }\n}\n',
        code: 'using System.Linq;\n\npublic static class Solution\n{\n    public static int[] TopKFrequent(int[] nums, int k)\n    {\n        return nums.GroupBy(n => n)\n            .OrderByDescending(g => g.Count())\n            .Take(k)\n            .Select(g => g.Key)\n            .OrderBy(v => v)\n            .ToArray();\n    }\n}\n'
      }
    },

    'valid-palindrome': {
      typescript: {
        starter: 'function isPalindrome(s: string): boolean {\n  // your code here\n  return false;\n}\n',
        code: 'function isPalindrome(s: string): boolean {\n  const ok = (c: string): boolean => /[a-z0-9]/i.test(c);\n  let i = 0;\n  let j = s.length - 1;\n  while (i < j) {\n    if (!ok(s[i])) { i++; continue; }\n    if (!ok(s[j])) { j--; continue; }\n    if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;\n    i++;\n    j--;\n  }\n  return true;\n}\n'
      },
      python: {
        starter: 'def is_palindrome(s: str) -> bool:\n    # your code here\n    pass\n',
        code: 'def is_palindrome(s: str) -> bool:\n    i, j = 0, len(s) - 1\n    while i < j:\n        if not s[i].isalnum():\n            i += 1\n        elif not s[j].isalnum():\n            j -= 1\n        elif s[i].lower() != s[j].lower():\n            return False\n        else:\n            i += 1\n            j -= 1\n    return True\n'
      },
      java: {
        starter: 'class Solution {\n    public static boolean isPalindrome(String s) {\n        // your code here\n        return false;\n    }\n}\n',
        code: 'class Solution {\n    public static boolean isPalindrome(String s) {\n        int i = 0, j = s.length() - 1;\n        while (i < j) {\n            if (!Character.isLetterOrDigit(s.charAt(i))) { i++; continue; }\n            if (!Character.isLetterOrDigit(s.charAt(j))) { j--; continue; }\n            if (Character.toLowerCase(s.charAt(i)) != Character.toLowerCase(s.charAt(j))) return false;\n            i++;\n            j--;\n        }\n        return true;\n    }\n}\n'
      },
      cpp: {
        starter: '#include <string>\nusing namespace std;\n\nbool isPalindrome(const string& s) {\n    // your code here\n    return false;\n}\n',
        code: '#include <string>\n#include <cctype>\nusing namespace std;\n\nbool isPalindrome(const string& s) {\n    int i = 0, j = (int)s.size() - 1;\n    while (i < j) {\n        if (!isalnum((unsigned char)s[i])) { i++; continue; }\n        if (!isalnum((unsigned char)s[j])) { j--; continue; }\n        if (tolower((unsigned char)s[i]) != tolower((unsigned char)s[j])) return false;\n        i++;\n        j--;\n    }\n    return true;\n}\n'
      },
      go: {
        starter: 'package main\n\nfunc isPalindrome(s string) bool {\n\t// your code here\n\treturn false\n}\n',
        code: 'package main\n\nimport (\n\t"unicode"\n)\n\nfunc isPalindrome(s string) bool {\n\tr := []rune(s)\n\ti, j := 0, len(r)-1\n\tfor i < j {\n\t\tif !unicode.IsLetter(r[i]) && !unicode.IsDigit(r[i]) {\n\t\t\ti++\n\t\t\tcontinue\n\t\t}\n\t\tif !unicode.IsLetter(r[j]) && !unicode.IsDigit(r[j]) {\n\t\t\tj--\n\t\t\tcontinue\n\t\t}\n\t\tif unicode.ToLower(r[i]) != unicode.ToLower(r[j]) {\n\t\t\treturn false\n\t\t}\n\t\ti++\n\t\tj--\n\t}\n\treturn true\n}\n'
      },
      csharp: {
        starter: 'public static class Solution\n{\n    public static bool IsPalindrome(string s)\n    {\n        // your code here\n        return false;\n    }\n}\n',
        code: 'public static class Solution\n{\n    public static bool IsPalindrome(string s)\n    {\n        int i = 0, j = s.Length - 1;\n        while (i < j)\n        {\n            if (!char.IsLetterOrDigit(s[i])) { i++; continue; }\n            if (!char.IsLetterOrDigit(s[j])) { j--; continue; }\n            if (char.ToLowerInvariant(s[i]) != char.ToLowerInvariant(s[j])) return false;\n            i++;\n            j--;\n        }\n        return true;\n    }\n}\n'
      }
    }
  };
})();
