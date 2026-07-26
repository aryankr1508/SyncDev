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
    [
        'Java collections are not JSX',
        'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    List<String> names = new ArrayList<>();\n    names.add("Aryan");\n    System.out.println(names.get(0));\n  }\n}',
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
        'C++ templates are not JSX',
        '#include <bits/stdc++.h>\nusing namespace std;\ntemplate<typename T> T twice(T value) { return value + value; }\nint main() { vector<int> values{21}; cout << twice(values[0]); }',
        'cpp',
    ],
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
    [
        'Python comparisons are not JSX',
        'score = 42\nAverage = 50\nif score < Average:\n    print(score)',
        'python',
    ],
    ['JSX component', 'const app = <Card title="SyncDev" />;', 'jsx'],
    ['JSX element', 'const app = <main>Hello</main>;', 'jsx'],
    ['TSX', 'interface Props { title: string }\nreturn (<Card title={title} />);', 'tsx'],
    ['Shell', 'export APP_ENV=dev\necho $APP_ENV', 'shell'],
])('detects %s', (name, code, expectedLanguage) => {
    expect(detectLanguage(code)).toBe(expectedLanguage);
});
