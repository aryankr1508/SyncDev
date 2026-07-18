import { detectLanguage } from './languages';

test.each([
    ['JavaScript', 'const total = items.map((item) => item.price);', 'javascript'],
    ['TypeScript', 'interface User { name: string; active: boolean }', 'typescript'],
    ['Python', 'def greet(name):\n    print(f"Hello {name}")', 'python'],
    ['HTML', '<!doctype html><html><body><main>Hello</main></body></html>', 'html'],
    ['CSS', '.card { display: flex; padding: 1rem; color: white; }', 'css'],
    ['JSON', '{"name":"Code Sync","active":true}', 'json'],
    ['SQL', 'SELECT id, name FROM users LEFT JOIN teams ON teams.id = users.team_id', 'sql'],
    ['C++', '#include <iostream>\nint main() { std::cout << "Hi"; }', 'cpp'],
    ['Go', 'package main\nfunc main() { fmt.Println("Hi") }', 'go'],
    ['TSX', 'interface Props { title: string }\nreturn (<Card title={title} />);', 'tsx'],
    ['Shell', 'export APP_ENV=dev\necho $APP_ENV', 'shell'],
])('detects %s', (name, code, expectedLanguage) => {
    expect(detectLanguage(code)).toBe(expectedLanguage);
});
