import { detectLanguage } from './languages';

test.each([
    ['JavaScript', 'const total = items.map((item) => item.price);', 'javascript'],
    ['TypeScript', 'interface User { name: string; active: boolean }', 'typescript'],
    ['Python', 'def greet(name):\n    print(f"Hello {name}")', 'python'],
    [
        'Python script',
        'from pathlib import Path\nname = input()\nprint(f"Hello {name}")',
        'python',
    ],
    [
        'Java application',
        'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}',
        'java',
    ],
    [
        'Java coding challenge',
        'class Solution {\n  public int add(int left, int right) {\n    return left + right;\n  }\n}',
        'java',
    ],
    ['HTML', '<!doctype html><html><body><main>Hello</main></body></html>', 'html'],
    ['CSS', '.card { display: flex; padding: 1rem; color: white; }', 'css'],
    ['JSON', '{"name":"Code Sync","active":true}', 'json'],
    ['SQL', 'SELECT id, name FROM users LEFT JOIN teams ON teams.id = users.team_id', 'sql'],
    ['SQL expression', 'SELECT 1 AS answer;', 'sql'],
    [
        'SQL schema and data',
        'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);\nINSERT INTO users (name) VALUES (\'Aryan\');',
        'sql',
    ],
    ['C++', '#include <iostream>\nint main() { std::cout << "Hi"; }', 'cpp'],
    [
        'C',
        '#include <stdio.h>\nint main(void) { printf("Hello\\n"); return 0; }',
        'c',
    ],
    [
        'C# without Java confusion',
        'using System;\nclass Program { static void Main() { Console.WriteLine("Hi"); } }',
        'csharp',
    ],
    [
        'Kotlin without Java confusion',
        'fun main() {\n  val name = "SyncDev"\n  println(name)\n}',
        'kotlin',
    ],
    ['Go', 'package main\nfunc main() { fmt.Println("Hi") }', 'go'],
    ['TSX', 'interface Props { title: string }\nreturn (<Card title={title} />);', 'tsx'],
    ['Shell', 'export APP_ENV=dev\necho $APP_ENV', 'shell'],
])('detects %s', (name, code, expectedLanguage) => {
    expect(detectLanguage(code)).toBe(expectedLanguage);
});
