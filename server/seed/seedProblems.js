const mongoose = require('mongoose');
const Problem  = require('../models/Problem');
require('dotenv').config();

// ─── C++ starter code templates (complete programs with main()) ───────────────

const CPP = {
    twoSum: `#include <bits/stdc++.h>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Write your code here
    
}

int main() {
    int n; cin >> n;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int target; cin >> target;
    vector<int> res = twoSum(nums, target);
    for (int i = 0; i < (int)res.size(); i++) { if (i) cout << " "; cout << res[i]; }
    cout << "\\n";
}`,

    reverseString: `#include <bits/stdc++.h>
using namespace std;

void reverseString(vector<char>& s) {
    // Write your code here (modify in place)
    
}

int main() {
    int n; cin >> n;
    vector<char> s(n);
    for (int i = 0; i < n; i++) { string t; cin >> t; s[i] = t[0]; }
    reverseString(s);
    for (int i = 0; i < (int)s.size(); i++) { if (i) cout << " "; cout << s[i]; }
    cout << "\\n";
}`,

    palindromeNumber: `#include <bits/stdc++.h>
using namespace std;

bool isPalindrome(int x) {
    // Write your code here
    
}

int main() {
    int x; cin >> x;
    cout << (isPalindrome(x) ? "true" : "false") << "\\n";
}`,

    validParentheses: `#include <bits/stdc++.h>
using namespace std;

bool isValid(string s) {
    // Write your code here
    
}

int main() {
    string s; cin >> s;
    cout << (isValid(s) ? "true" : "false") << "\\n";
}`,

    maxSubarray: `#include <bits/stdc++.h>
using namespace std;

int maxSubArray(vector<int>& nums) {
    // Write your code here
    
}

int main() {
    int n; cin >> n;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    cout << maxSubArray(nums) << "\\n";
}`,

    binarySearch: `#include <bits/stdc++.h>
using namespace std;

int search(vector<int>& nums, int target) {
    // Write your code here
    
}

int main() {
    int n; cin >> n;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int target; cin >> target;
    cout << search(nums, target) << "\\n";
}`,

    fibonacci: `#include <bits/stdc++.h>
using namespace std;

int fib(int n) {
    // Write your code here
    
}

int main() {
    int n; cin >> n;
    cout << fib(n) << "\\n";
}`,

    longestSubstring: `#include <bits/stdc++.h>
using namespace std;

int lengthOfLongestSubstring(string s) {
    // Write your code here
    
}

int main() {
    string s; cin >> s;
    cout << lengthOfLongestSubstring(s) << "\\n";
}`,

    containerWater: `#include <bits/stdc++.h>
using namespace std;

int maxArea(vector<int>& height) {
    // Write your code here
    
}

int main() {
    int n; cin >> n;
    vector<int> h(n);
    for (int i = 0; i < n; i++) cin >> h[i];
    cout << maxArea(h) << "\\n";
}`,

    climbingStairs: `#include <bits/stdc++.h>
using namespace std;

int climbStairs(int n) {
    // Write your code here
    
}

int main() {
    int n; cin >> n;
    cout << climbStairs(n) << "\\n";
}`
};

// ─── Problem data ─────────────────────────────────────────────────────────────

const sampleProblems = [
    {
        title: 'Two Sum',
        description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.`,
        difficulty: 'Easy',
        tags: ['Array', 'Hash Table'],
        examples: [
            { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]',  explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
            { input: 'nums = [3,2,4], target = 6',     output: '[1,2]',  explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].' }
        ],
        constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9', 'Only one valid answer exists.'],
        testCases: [
            { input: { nums: [2,7,11,15], target: 9 }, expectedOutput: [0,1], stdin: '4\n2 7 11 15\n9',           expectedStdout: '0 1', isPublic: true  },
            { input: { nums: [3,2,4],     target: 6 }, expectedOutput: [1,2], stdin: '3\n3 2 4\n6',               expectedStdout: '1 2', isPublic: true  },
            { input: { nums: [3,3],       target: 6 }, expectedOutput: [0,1], stdin: '2\n3 3\n6',                 expectedStdout: '0 1', isPublic: true  },
            { input: { nums: [1,2,3,4,5], target: 9 }, expectedOutput: [3,4], stdin: '5\n1 2 3 4 5\n9',          expectedStdout: '3 4', isPublic: false },
            { input: { nums: [-1,-2,-3,-4,-5], target: -8 }, expectedOutput: [2,4], stdin: '5\n-1 -2 -3 -4 -5\n-8', expectedStdout: '2 4', isPublic: false },
            { input: { nums: [0,4,3,0],  target: 0 }, expectedOutput: [0,3], stdin: '4\n0 4 3 0\n0',             expectedStdout: '0 3', isPublic: false }
        ],
        starterCode: { javascript: `function solution(input) {\n  const { nums, target } = input;\n  // Write your code here\n  \n}`, cpp: CPP.twoSum },
        cppWrapper: ''
    },

    {
        title: 'Reverse String',
        description: `Write a function that reverses a string. The input string is given as an array of characters s.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.`,
        difficulty: 'Easy',
        tags: ['String', 'Two Pointers'],
        examples: [
            { input: 's = ["h","e","l","l","o"]',     output: '["o","l","l","e","h"]', explanation: '' },
            { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]', explanation: '' }
        ],
        constraints: ['1 <= s.length <= 10^5', 's[i] is a printable ascii character.'],
        testCases: [
            { input: ['h','e','l','l','o'],      expectedOutput: ['o','l','l','e','h'],      stdin: '5\nh e l l o',      expectedStdout: 'o l l e h', isPublic: true  },
            { input: ['H','a','n','n','a','h'],  expectedOutput: ['h','a','n','n','a','H'],  stdin: '6\nH a n n a h',    expectedStdout: 'h a n n a H', isPublic: true  },
            { input: ['A'],                       expectedOutput: ['A'],                      stdin: '1\nA',               expectedStdout: 'A', isPublic: true  },
            { input: ['a','b','c'],              expectedOutput: ['c','b','a'],              stdin: '3\na b c',           expectedStdout: 'c b a', isPublic: false },
            { input: ['x','y'],                  expectedOutput: ['y','x'],                  stdin: '2\nx y',             expectedStdout: 'y x', isPublic: false },
            { input: ['1','2','3','4','5'],      expectedOutput: ['5','4','3','2','1'],      stdin: '5\n1 2 3 4 5',      expectedStdout: '5 4 3 2 1', isPublic: false }
        ],
        starterCode: { javascript: `function solution(input) {\n  const s = [...input];\n  // Write your code here — return the reversed array\n  \n}`, cpp: CPP.reverseString },
        cppWrapper: ''
    },

    {
        title: 'Palindrome Number',
        description: `Given an integer x, return true if x is a palindrome, and false otherwise.\n\nAn integer is a palindrome when it reads the same backward as forward.`,
        difficulty: 'Easy',
        tags: ['Math'],
        examples: [
            { input: 'x = 121',  output: 'true',  explanation: '121 reads as 121 from left to right and from right to left.' },
            { input: 'x = -121', output: 'false', explanation: 'From left to right, it reads -121. From right to left, it becomes 121-.' },
            { input: 'x = 10',   output: 'false', explanation: 'Reads as 01 from right to left.' }
        ],
        constraints: ['-2^31 <= x <= 2^31 - 1'],
        testCases: [
            { input: 121,   expectedOutput: true,  stdin: '121',   expectedStdout: 'true',  isPublic: true  },
            { input: -121,  expectedOutput: false, stdin: '-121',  expectedStdout: 'false', isPublic: true  },
            { input: 10,    expectedOutput: false, stdin: '10',    expectedStdout: 'false', isPublic: true  },
            { input: 0,     expectedOutput: true,  stdin: '0',     expectedStdout: 'true',  isPublic: false },
            { input: 1221,  expectedOutput: true,  stdin: '1221',  expectedStdout: 'true',  isPublic: false },
            { input: 12345, expectedOutput: false, stdin: '12345', expectedStdout: 'false', isPublic: false }
        ],
        starterCode: { javascript: `function solution(input) {\n  const x = input;\n  // Write your code here\n  \n}`, cpp: CPP.palindromeNumber },
        cppWrapper: ''
    },

    {
        title: 'Valid Parentheses',
        description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.`,
        difficulty: 'Medium',
        tags: ['String', 'Stack'],
        examples: [
            { input: 's = "()"',     output: 'true',  explanation: '' },
            { input: 's = "()[]{}"', output: 'true',  explanation: '' },
            { input: 's = "(]"',     output: 'false', explanation: '' }
        ],
        constraints: ['1 <= s.length <= 10^4', "s consists of parentheses only '()[]{}'."],
        testCases: [
            { input: '()',      expectedOutput: true,  stdin: '()',      expectedStdout: 'true',  isPublic: true  },
            { input: '()[]{}', expectedOutput: true,  stdin: '()[]{}', expectedStdout: 'true',  isPublic: true  },
            { input: '(]',     expectedOutput: false, stdin: '(]',     expectedStdout: 'false', isPublic: true  },
            { input: '([)]',   expectedOutput: false, stdin: '([)]',   expectedStdout: 'false', isPublic: false },
            { input: '{[]}',   expectedOutput: true,  stdin: '{[]}',   expectedStdout: 'true',  isPublic: false },
            { input: '(((',    expectedOutput: false, stdin: '(((',    expectedStdout: 'false', isPublic: false }
        ],
        starterCode: { javascript: `function solution(input) {\n  const s = input;\n  // Write your code here\n  \n}`, cpp: CPP.validParentheses },
        cppWrapper: ''
    },

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
        constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
        testCases: [
            { input: [-2,1,-3,4,-1,2,1,-5,4], expectedOutput: 6,  stdin: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedStdout: '6',  isPublic: true  },
            { input: [1],                       expectedOutput: 1,  stdin: '1\n1',                       expectedStdout: '1',  isPublic: true  },
            { input: [5,4,-1,7,8],             expectedOutput: 23, stdin: '5\n5 4 -1 7 8',              expectedStdout: '23', isPublic: true  },
            { input: [-1,-2,-3],               expectedOutput: -1, stdin: '3\n-1 -2 -3',                expectedStdout: '-1', isPublic: false },
            { input: [1,2,3,4,5],              expectedOutput: 15, stdin: '5\n1 2 3 4 5',               expectedStdout: '15', isPublic: false },
            { input: [-2,1],                   expectedOutput: 1,  stdin: '2\n-2 1',                    expectedStdout: '1',  isPublic: false }
        ],
        starterCode: { javascript: `function solution(input) {\n  const nums = input;\n  // Write your code here\n  \n}`, cpp: CPP.maxSubarray },
        cppWrapper: ''
    },

    {
        title: 'Binary Search',
        description: `Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.`,
        difficulty: 'Easy',
        tags: ['Array', 'Binary Search'],
        examples: [
            { input: 'nums = [-1,0,3,5,9,12], target = 9',  output: '4',  explanation: '9 exists in nums and its index is 4.' },
            { input: 'nums = [-1,0,3,5,9,12], target = 2',  output: '-1', explanation: '2 does not exist in nums so return -1.' }
        ],
        constraints: ['1 <= nums.length <= 10^4', '-10^4 < nums[i], target < 10^4', 'All integers in nums are unique.', 'nums is sorted in ascending order.'],
        testCases: [
            { input: { nums: [-1,0,3,5,9,12], target: 9  }, expectedOutput: 4,  stdin: '6\n-1 0 3 5 9 12\n9',  expectedStdout: '4',  isPublic: true  },
            { input: { nums: [-1,0,3,5,9,12], target: 2  }, expectedOutput: -1, stdin: '6\n-1 0 3 5 9 12\n2',  expectedStdout: '-1', isPublic: true  },
            { input: { nums: [1],              target: 1  }, expectedOutput: 0,  stdin: '1\n1\n1',              expectedStdout: '0',  isPublic: true  },
            { input: { nums: [1],              target: 2  }, expectedOutput: -1, stdin: '1\n1\n2',              expectedStdout: '-1', isPublic: false },
            { input: { nums: [1,3,5,7,9,11,13,15], target: 7 }, expectedOutput: 3, stdin: '8\n1 3 5 7 9 11 13 15\n7', expectedStdout: '3', isPublic: false },
            { input: { nums: [-5,-3,-1,2,4,6], target: -3 }, expectedOutput: 1, stdin: '6\n-5 -3 -1 2 4 6\n-3', expectedStdout: '1', isPublic: false }
        ],
        starterCode: { javascript: `function solution(input) {\n  const { nums, target } = input;\n  // Write your code here\n  \n}`, cpp: CPP.binarySearch },
        cppWrapper: ''
    },

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
            { input: 2,  expectedOutput: 1,  stdin: '2',  expectedStdout: '1',  isPublic: true  },
            { input: 3,  expectedOutput: 2,  stdin: '3',  expectedStdout: '2',  isPublic: true  },
            { input: 4,  expectedOutput: 3,  stdin: '4',  expectedStdout: '3',  isPublic: true  },
            { input: 0,  expectedOutput: 0,  stdin: '0',  expectedStdout: '0',  isPublic: false },
            { input: 1,  expectedOutput: 1,  stdin: '1',  expectedStdout: '1',  isPublic: false },
            { input: 10, expectedOutput: 55, stdin: '10', expectedStdout: '55', isPublic: false }
        ],
        starterCode: { javascript: `function solution(input) {\n  const n = input;\n  // Write your code here\n  \n}`, cpp: CPP.fibonacci },
        cppWrapper: ''
    },

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
        constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.'],
        testCases: [
            { input: 'abcabcbb', expectedOutput: 3, stdin: 'abcabcbb', expectedStdout: '3', isPublic: true  },
            { input: 'bbbbb',    expectedOutput: 1, stdin: 'bbbbb',    expectedStdout: '1', isPublic: true  },
            { input: 'pwwkew',   expectedOutput: 3, stdin: 'pwwkew',   expectedStdout: '3', isPublic: true  },
            { input: 'abcdef',   expectedOutput: 6, stdin: 'abcdef',   expectedStdout: '6', isPublic: false },
            { input: 'a',        expectedOutput: 1, stdin: 'a',        expectedStdout: '1', isPublic: false },
            { input: 'dvdf',     expectedOutput: 3, stdin: 'dvdf',     expectedStdout: '3', isPublic: false }
        ],
        starterCode: { javascript: `function solution(input) {\n  const s = input;\n  // Write your code here\n  \n}`, cpp: CPP.longestSubstring },
        cppWrapper: ''
    },

    {
        title: 'Container With Most Water',
        description: `You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.`,
        difficulty: 'Medium',
        tags: ['Array', 'Two Pointers', 'Greedy'],
        examples: [
            { input: 'height = [1,8,6,2,5,4,8,3,7]', output: '49', explanation: 'Lines at index 1 and 8: area = min(8,7) * 7 = 49.' }
        ],
        constraints: ['n == height.length', '2 <= n <= 10^5', '0 <= height[i] <= 10^4'],
        testCases: [
            { input: [1,8,6,2,5,4,8,3,7],       expectedOutput: 49,  stdin: '9\n1 8 6 2 5 4 8 3 7',       expectedStdout: '49',  isPublic: true  },
            { input: [1,1],                       expectedOutput: 1,   stdin: '2\n1 1',                      expectedStdout: '1',   isPublic: true  },
            { input: [4,3,2,1,4],                 expectedOutput: 16,  stdin: '5\n4 3 2 1 4',                expectedStdout: '16',  isPublic: true  },
            { input: [1,2,1],                     expectedOutput: 2,   stdin: '3\n1 2 1',                    expectedStdout: '2',   isPublic: false },
            { input: [2,3,4,5,18,17,6],           expectedOutput: 17,  stdin: '7\n2 3 4 5 18 17 6',          expectedStdout: '17',  isPublic: false },
            { input: [1,8,100,2,100,4,8,3,7],    expectedOutput: 200, stdin: '9\n1 8 100 2 100 4 8 3 7',    expectedStdout: '200', isPublic: false }
        ],
        starterCode: { javascript: `function solution(input) {\n  const height = input;\n  // Write your code here\n  \n}`, cpp: CPP.containerWater },
        cppWrapper: ''
    },

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
            { input: 2,  expectedOutput: 2,  stdin: '2',  expectedStdout: '2',  isPublic: true  },
            { input: 3,  expectedOutput: 3,  stdin: '3',  expectedStdout: '3',  isPublic: true  },
            { input: 4,  expectedOutput: 5,  stdin: '4',  expectedStdout: '5',  isPublic: true  },
            { input: 1,  expectedOutput: 1,  stdin: '1',  expectedStdout: '1',  isPublic: false },
            { input: 5,  expectedOutput: 8,  stdin: '5',  expectedStdout: '8',  isPublic: false },
            { input: 10, expectedOutput: 89, stdin: '10', expectedStdout: '89', isPublic: false }
        ],
        starterCode: { javascript: `function solution(input) {\n  const n = input;\n  // Write your code here\n  \n}`, cpp: CPP.climbingStairs },
        cppWrapper: ''
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        await Problem.deleteMany({});
        console.log('✓ Cleared existing problems');

        const inserted = await Problem.insertMany(sampleProblems);
        console.log(`✓ Seeded ${inserted.length} problems`);

        for (const p of inserted) {
            const pub  = p.testCases.filter(t => t.isPublic).length;
            const priv = p.testCases.filter(t => !t.isPublic).length;
            console.log(`  • ${p.title}: ${pub} public, ${priv} private`);
        }

        mongoose.connection.close();
        console.log('✓ Done');
    } catch (error) {
        console.error('✗ Seed error:', error);
        process.exit(1);
    }
}

seedDatabase();
