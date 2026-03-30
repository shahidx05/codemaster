const mongoose = require('mongoose');
const Problem  = require('../models/Problem');
require('dotenv').config();

// ─── C++ wrapper templates ────────────────────────────────────────────────────
// Each wrapper is a complete main() function.
// The executor prepends CPP_JSON_UTILS (which has #include<bits/stdc++.h> and
// the _jsonXxx helpers), then the student's code, then this wrapper.
// stdin = JSON.stringify(testCase.input)
// stdout must equal JSON.stringify(testCase.expectedOutput)

const W = {
    // {nums, target} → int[]
    twoSum: `int main() {
    string line;
    getline(cin, line);
    vector<int> nums = _jsonIntArray(line, "nums");
    int target = (int)_jsonInt(line, "target");
    Solution sol;
    auto res = sol.solution(nums, target);
    cout << "[";
    for (int i = 0; i < (int)res.size(); i++) {
        if (i) cout << ",";
        cout << res[i];
    }
    cout << "]" << endl;
    return 0;
}`,

    // char[] → char[]  (modifies in place)
    reverseString: `int main() {
    string line;
    getline(cin, line);
    vector<char> s = _jsonCharArray(line);
    Solution sol;
    sol.solution(s);
    cout << "[";
    for (int i = 0; i < (int)s.size(); i++) {
        if (i) cout << ",";
        cout << "\\"" << s[i] << "\\"";
    }
    cout << "]" << endl;
    return 0;
}`,

    // int → bool
    palindromeNumber: `int main() {
    string line;
    getline(cin, line);
    int x = (int)_jsonInt(line);
    Solution sol;
    cout << (sol.solution(x) ? "true" : "false") << endl;
    return 0;
}`,

    // string (JSON string literal) → bool
    validParentheses: `int main() {
    string line;
    getline(cin, line);
    string s = _jsonString(line);
    Solution sol;
    cout << (sol.solution(s) ? "true" : "false") << endl;
    return 0;
}`,

    // int[] → int
    maxSubarray: `int main() {
    string line;
    getline(cin, line);
    vector<int> nums = _jsonIntArray(line);
    Solution sol;
    cout << sol.solution(nums) << endl;
    return 0;
}`,

    // {nums, target} → int
    binarySearch: `int main() {
    string line;
    getline(cin, line);
    vector<int> nums = _jsonIntArray(line, "nums");
    int target = (int)_jsonInt(line, "target");
    Solution sol;
    cout << sol.solution(nums, target) << endl;
    return 0;
}`,

    // int → int
    singleInt: `int main() {
    string line;
    getline(cin, line);
    int n = (int)_jsonInt(line);
    Solution sol;
    cout << sol.solution(n) << endl;
    return 0;
}`,

    // string (JSON string literal) → int
    stringToInt: `int main() {
    string line;
    getline(cin, line);
    string s = _jsonString(line);
    Solution sol;
    cout << sol.solution(s) << endl;
    return 0;
}`,

    // int[] → int
    intArrayToInt: `int main() {
    string line;
    getline(cin, line);
    vector<int> nums = _jsonIntArray(line);
    Solution sol;
    cout << sol.solution(nums) << endl;
    return 0;
}`
};

// ─── Problem data ─────────────────────────────────────────────────────────────

const sampleProblems = [
    // ── 1 ── Two Sum ─────────────────────────────────────────────────────────
    {
        title: 'Two Sum',
        description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.`,
        difficulty: 'Easy',
        tags: ['Array', 'Hash Table'],
        examples: [
            { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]',  explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
            { input: 'nums = [3,2,4], target = 6',     output: '[1,2]',  explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].' }
        ],
        constraints: [
            '2 <= nums.length <= 10^4',
            '-10^9 <= nums[i] <= 10^9',
            '-10^9 <= target <= 10^9',
            'Only one valid answer exists.'
        ],
        testCases: [
            { input: { nums: [2, 7, 11, 15], target: 9  }, expectedOutput: [0, 1], isPublic: true  },
            { input: { nums: [3, 2, 4],      target: 6  }, expectedOutput: [1, 2], isPublic: true  },
            { input: { nums: [3, 3],          target: 6  }, expectedOutput: [0, 1], isPublic: true  },
            { input: { nums: [1, 2, 3, 4, 5], target: 9  }, expectedOutput: [3, 4], isPublic: false },
            { input: { nums: [-1, -2, -3, -4, -5], target: -8 }, expectedOutput: [2, 4], isPublic: false },
            { input: { nums: [0, 4, 3, 0],    target: 0  }, expectedOutput: [0, 3], isPublic: false }
        ],
        starterCode: {
            javascript: `function solution(input) {
  const { nums, target } = input;
  // Write your code here
  
}`,
            // Do not add #include — it is auto-injected
            cpp: `class Solution {
public:
    vector<int> solution(vector<int>& nums, int target) {
        // Write your code here
        
    }
};`
        },
        cppWrapper: W.twoSum
    },

    // ── 2 ── Reverse String ───────────────────────────────────────────────────
    {
        title: 'Reverse String',
        description: `Write a function that reverses a string. The input string is given as an array of characters s.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.`,
        difficulty: 'Easy',
        tags: ['String', 'Two Pointers'],
        examples: [
            { input: 's = ["h","e","l","l","o"]',       output: '["o","l","l","e","h"]', explanation: '' },
            { input: 's = ["H","a","n","n","a","h"]',   output: '["h","a","n","n","a","H"]', explanation: '' }
        ],
        constraints: [
            '1 <= s.length <= 10^5',
            's[i] is a printable ascii character.'
        ],
        testCases: [
            { input: ['h', 'e', 'l', 'l', 'o'],       expectedOutput: ['o', 'l', 'l', 'e', 'h'],       isPublic: true  },
            { input: ['H', 'a', 'n', 'n', 'a', 'h'],  expectedOutput: ['h', 'a', 'n', 'n', 'a', 'H'],  isPublic: true  },
            { input: ['A'],                             expectedOutput: ['A'],                            isPublic: true  },
            { input: ['a', 'b', 'c'],                  expectedOutput: ['c', 'b', 'a'],                  isPublic: false },
            { input: ['x', 'y'],                       expectedOutput: ['y', 'x'],                       isPublic: false },
            { input: ['1', '2', '3', '4', '5'],        expectedOutput: ['5', '4', '3', '2', '1'],        isPublic: false }
        ],
        starterCode: {
            javascript: `function solution(input) {
  const s = [...input];
  // Write your code here — return the reversed array
  
}`,
            // Do not add #include — it is auto-injected
            cpp: `class Solution {
public:
    void solution(vector<char>& s) {
        // Write your code here (modify in place)
        
    }
};`
        },
        cppWrapper: W.reverseString
    },

    // ── 3 ── Palindrome Number ────────────────────────────────────────────────
    {
        title: 'Palindrome Number',
        description: `Given an integer x, return true if x is a palindrome, and false otherwise.\n\nAn integer is a palindrome when it reads the same backward as forward.`,
        difficulty: 'Easy',
        tags: ['Math'],
        examples: [
            { input: 'x = 121',  output: 'true',  explanation: '121 reads as 121 from left to right and from right to left.' },
            { input: 'x = -121', output: 'false', explanation: 'From left to right, it reads -121. From right to left, it becomes 121-.' },
            { input: 'x = 10',   output: 'false', explanation: 'Reads as 01 from right to left. Therefore it is not a palindrome.' }
        ],
        constraints: ['-2^31 <= x <= 2^31 - 1'],
        testCases: [
            { input: 121,   expectedOutput: true,  isPublic: true  },
            { input: -121,  expectedOutput: false, isPublic: true  },
            { input: 10,    expectedOutput: false, isPublic: true  },
            { input: 0,     expectedOutput: true,  isPublic: false },
            { input: 1221,  expectedOutput: true,  isPublic: false },
            { input: 12321, expectedOutput: true,  isPublic: false },
            { input: 12345, expectedOutput: false, isPublic: false }
        ],
        starterCode: {
            javascript: `function solution(input) {
  const x = input;
  // Write your code here
  
}`,
            // Do not add #include — it is auto-injected
            cpp: `class Solution {
public:
    bool solution(int x) {
        // Write your code here
        
    }
};`
        },
        cppWrapper: W.palindromeNumber
    },

    // ── 4 ── Valid Parentheses ────────────────────────────────────────────────
    {
        title: 'Valid Parentheses',
        description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.`,
        difficulty: 'Medium',
        tags: ['String', 'Stack'],
        examples: [
            { input: 's = "()"',      output: 'true',  explanation: '' },
            { input: 's = "()[]{}"',  output: 'true',  explanation: '' },
            { input: 's = "(]"',      output: 'false', explanation: '' }
        ],
        constraints: [
            '1 <= s.length <= 10^4',
            "s consists of parentheses only '()[]{}'."
        ],
        testCases: [
            { input: '()',       expectedOutput: true,  isPublic: true  },
            { input: '()[]{}',  expectedOutput: true,  isPublic: true  },
            { input: '(]',      expectedOutput: false, isPublic: true  },
            { input: '([)]',    expectedOutput: false, isPublic: false },
            { input: '{[]}',    expectedOutput: true,  isPublic: false },
            { input: '()()()',  expectedOutput: true,  isPublic: false },
            { input: '(((',     expectedOutput: false, isPublic: false }
        ],
        starterCode: {
            javascript: `function solution(input) {
  const s = input;
  // Write your code here
  
}`,
            // Do not add #include — it is auto-injected
            cpp: `class Solution {
public:
    bool solution(string s) {
        // Write your code here
        
    }
};`
        },
        cppWrapper: W.validParentheses
    },

    // ── 5 ── Maximum Subarray ─────────────────────────────────────────────────
    {
        title: 'Maximum Subarray',
        description: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
        difficulty: 'Medium',
        tags: ['Array', 'Dynamic Programming', 'Divide and Conquer'],
        examples: [
            { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6',  explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
            { input: 'nums = [1]',                       output: '1',  explanation: 'The subarray [1] has the largest sum 1.' },
            { input: 'nums = [5,4,-1,7,8]',              output: '23', explanation: 'The subarray [5,4,-1,7,8] has the largest sum 23.' }
        ],
        constraints: [
            '1 <= nums.length <= 10^5',
            '-10^4 <= nums[i] <= 10^4'
        ],
        testCases: [
            { input: [-2, 1, -3, 4, -1, 2, 1, -5, 4], expectedOutput: 6,  isPublic: true  },
            { input: [1],                               expectedOutput: 1,  isPublic: true  },
            { input: [5, 4, -1, 7, 8],                 expectedOutput: 23, isPublic: true  },
            { input: [-1, -2, -3],                     expectedOutput: -1, isPublic: false },
            { input: [1, 2, 3, 4, 5],                  expectedOutput: 15, isPublic: false },
            { input: [-2, 1],                           expectedOutput: 1,  isPublic: false }
        ],
        starterCode: {
            javascript: `function solution(input) {
  const nums = input;
  // Write your code here
  
}`,
            // Do not add #include — it is auto-injected
            cpp: `class Solution {
public:
    int solution(vector<int>& nums) {
        // Write your code here
        
    }
};`
        },
        cppWrapper: W.intArrayToInt
    },

    // ── 6 ── Binary Search ────────────────────────────────────────────────────
    {
        title: 'Binary Search',
        description: `Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.`,
        difficulty: 'Easy',
        tags: ['Array', 'Binary Search'],
        examples: [
            { input: 'nums = [-1,0,3,5,9,12], target = 9',  output: '4',  explanation: '9 exists in nums and its index is 4.' },
            { input: 'nums = [-1,0,3,5,9,12], target = 2',  output: '-1', explanation: '2 does not exist in nums so return -1.' }
        ],
        constraints: [
            '1 <= nums.length <= 10^4',
            '-10^4 < nums[i], target < 10^4',
            'All the integers in nums are unique.',
            'nums is sorted in ascending order.'
        ],
        testCases: [
            { input: { nums: [-1, 0, 3, 5, 9, 12], target: 9  }, expectedOutput: 4,  isPublic: true  },
            { input: { nums: [-1, 0, 3, 5, 9, 12], target: 2  }, expectedOutput: -1, isPublic: true  },
            { input: { nums: [1],                   target: 1  }, expectedOutput: 0,  isPublic: true  },
            { input: { nums: [1],                   target: 2  }, expectedOutput: -1, isPublic: false },
            { input: { nums: [1, 3, 5, 7, 9, 11, 13, 15], target: 7 }, expectedOutput: 3, isPublic: false },
            { input: { nums: [-5, -3, -1, 2, 4, 6], target: -3 }, expectedOutput: 1, isPublic: false }
        ],
        starterCode: {
            javascript: `function solution(input) {
  const { nums, target } = input;
  // Write your code here
  
}`,
            // Do not add #include — it is auto-injected
            cpp: `class Solution {
public:
    int solution(vector<int>& nums, int target) {
        // Write your code here
        
    }
};`
        },
        cppWrapper: W.binarySearch
    },

    // ── 7 ── Fibonacci Number ─────────────────────────────────────────────────
    {
        title: 'Fibonacci Number',
        description: `The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1.\n\nGiven n, calculate F(n).`,
        difficulty: 'Easy',
        tags: ['Math', 'Dynamic Programming', 'Recursion'],
        examples: [
            { input: 'n = 2', output: '1', explanation: 'F(2) = F(1) + F(0) = 1 + 0 = 1.' },
            { input: 'n = 3', output: '2', explanation: 'F(3) = F(2) + F(1) = 1 + 1 = 2.' },
            { input: 'n = 4', output: '3', explanation: 'F(4) = F(3) + F(2) = 2 + 1 = 3.' }
        ],
        constraints: ['0 <= n <= 30'],
        testCases: [
            { input: 2,  expectedOutput: 1,  isPublic: true  },
            { input: 3,  expectedOutput: 2,  isPublic: true  },
            { input: 4,  expectedOutput: 3,  isPublic: true  },
            { input: 0,  expectedOutput: 0,  isPublic: false },
            { input: 1,  expectedOutput: 1,  isPublic: false },
            { input: 5,  expectedOutput: 5,  isPublic: false },
            { input: 10, expectedOutput: 55, isPublic: false }
        ],
        starterCode: {
            javascript: `function solution(input) {
  const n = input;
  // Write your code here
  
}`,
            // Do not add #include — it is auto-injected
            cpp: `class Solution {
public:
    int solution(int n) {
        // Write your code here
        
    }
};`
        },
        cppWrapper: W.singleInt
    },

    // ── 8 ── Longest Substring Without Repeating Characters ───────────────────
    {
        title: 'Longest Substring Without Repeating Characters',
        description: 'Given a string s, find the length of the longest substring without repeating characters.',
        difficulty: 'Medium',
        tags: ['Hash Table', 'String', 'Sliding Window'],
        examples: [
            { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
            { input: 's = "bbbbb"',    output: '1', explanation: 'The answer is "b", with the length of 1.' },
            { input: 's = "pwwkew"',   output: '3', explanation: 'The answer is "wke", with the length of 3.' }
        ],
        constraints: [
            '0 <= s.length <= 5 * 10^4',
            's consists of English letters, digits, symbols and spaces.'
        ],
        testCases: [
            { input: 'abcabcbb', expectedOutput: 3, isPublic: true  },
            { input: 'bbbbb',    expectedOutput: 1, isPublic: true  },
            { input: 'pwwkew',   expectedOutput: 3, isPublic: true  },
            { input: 'abcdef',   expectedOutput: 6, isPublic: false },
            { input: 'a',        expectedOutput: 1, isPublic: false },
            { input: 'dvdf',     expectedOutput: 3, isPublic: false }
        ],
        starterCode: {
            javascript: `function solution(input) {
  const s = input;
  // Write your code here
  
}`,
            // Do not add #include — it is auto-injected
            cpp: `class Solution {
public:
    int solution(string s) {
        // Write your code here
        
    }
};`
        },
        cppWrapper: W.stringToInt
    },

    // ── 9 ── Container With Most Water ────────────────────────────────────────
    {
        title: 'Container With Most Water',
        description: `You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.`,
        difficulty: 'Medium',
        tags: ['Array', 'Two Pointers', 'Greedy'],
        examples: [
            { input: 'height = [1,8,6,2,5,4,8,3,7]', output: '49', explanation: 'Lines at index 1 (height 8) and index 8 (height 7): area = min(8,7) * 7 = 49.' }
        ],
        constraints: [
            'n == height.length',
            '2 <= n <= 10^5',
            '0 <= height[i] <= 10^4'
        ],
        testCases: [
            { input: [1, 8, 6, 2, 5, 4, 8, 3, 7],       expectedOutput: 49,  isPublic: true  },
            { input: [1, 1],                              expectedOutput: 1,   isPublic: true  },
            { input: [4, 3, 2, 1, 4],                     expectedOutput: 16,  isPublic: true  },
            { input: [1, 2, 1],                           expectedOutput: 2,   isPublic: false },
            { input: [2, 3, 4, 5, 18, 17, 6],             expectedOutput: 17,  isPublic: false },
            { input: [1, 8, 100, 2, 100, 4, 8, 3, 7],    expectedOutput: 200, isPublic: false }
        ],
        starterCode: {
            javascript: `function solution(input) {
  const height = input;
  // Write your code here
  
}`,
            // Do not add #include — it is auto-injected
            cpp: `class Solution {
public:
    int solution(vector<int>& height) {
        // Write your code here
        
    }
};`
        },
        cppWrapper: W.intArrayToInt
    },

    // ── 10 ── Climbing Stairs ─────────────────────────────────────────────────
    {
        title: 'Climbing Stairs',
        description: `You are climbing a staircase. It takes n steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
        difficulty: 'Easy',
        tags: ['Math', 'Dynamic Programming', 'Memoization'],
        examples: [
            { input: 'n = 2', output: '2', explanation: '1+1 or 2.' },
            { input: 'n = 3', output: '3', explanation: '1+1+1, 1+2, or 2+1.' }
        ],
        constraints: ['1 <= n <= 45'],
        testCases: [
            { input: 2,  expectedOutput: 2,  isPublic: true  },
            { input: 3,  expectedOutput: 3,  isPublic: true  },
            { input: 4,  expectedOutput: 5,  isPublic: true  },
            { input: 1,  expectedOutput: 1,  isPublic: false },
            { input: 5,  expectedOutput: 8,  isPublic: false },
            { input: 10, expectedOutput: 89, isPublic: false }
        ],
        starterCode: {
            javascript: `function solution(input) {
  const n = input;
  // Write your code here
  
}`,
            // Do not add #include — it is auto-injected
            cpp: `class Solution {
public:
    int solution(int n) {
        // Write your code here
        
    }
};`
        },
        cppWrapper: W.singleInt
    }
];

// ─── Seed runner ──────────────────────────────────────────────────────────────

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        await Problem.deleteMany({});
        console.log('✓ Cleared existing problems');

        const inserted = await Problem.insertMany(sampleProblems);
        console.log(`✓ Seeded ${inserted.length} problems`);

        // Summary of test case visibility
        for (const p of inserted) {
            const pub  = p.testCases.filter(t => t.isPublic).length;
            const priv = p.testCases.filter(t => !t.isPublic).length;
            console.log(`  • ${p.title}: ${pub} public, ${priv} private test cases`);
        }

        mongoose.connection.close();
        console.log('✓ Database connection closed');
    } catch (error) {
        console.error('✗ Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
