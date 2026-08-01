import type { CodeStub } from './types'

export const DEFAULT_STUBS: Record<string, CodeStub> = {
  CPP: {
    head: '',
    body: `#include <cmath>\n#include <cstdio>\n#include <vector>\n#include <iostream>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    /* Enter your code here. Read input from STDIN. Print output to STDOUT */\n    return 0;\n}`,
    tail: '',
  },
  JAVA: {
    head: 'import java.io.*;',
    body: `public class Solution {\n    public static void main(String[] args) throws IOException {\n        /* Enter your code here. Read input from STDIN. Print output to STDOUT */\n    }\n}`,
    tail: '',
  },
  PYTHON3: {
    head: '',
    body: `# Enter your code here. Read input from STDIN. Print output to STDOUT`,
    tail: '',
  },
}

// The editor shows DEFAULT_STUBS for any language the author never opened, so
// saving has to fall back the same way. Otherwise a template that was visible
// on screen is stored as an empty string and participants open a blank editor.
export function stubToStarterCode(langId: string, stub?: CodeStub): string {
  const source = stub || DEFAULT_STUBS[langId]
  if (!source) return ''
  return [source.head, source.body, source.tail].filter(Boolean).join('\n')
}
