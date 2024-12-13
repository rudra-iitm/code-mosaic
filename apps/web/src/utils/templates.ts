export const templates = [
    { 
        name: 'vite-project', 
        icon: '🐍', 
        starterCode: `print("Hello, World!")`
    },
    { 
        name: 'Node.js', 
        icon: '⚡', 
        starterCode: `console.log("Hello, World!")`
    },
    { 
        name: 'C++', 
        icon: '⚙️', 
        starterCode: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`
    },
    { 
        name: 'HTML, CSS, JS', 
        icon: '🌐', 
        starterCode: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
    <style>
        body { font-family: Arial, sans-serif; }
    </style>
</head>
<body>
    <h1>Hello, World!</h1>
    <script>
        console.log("Hello, World!");
    </script>
</body>
</html>`
    },
    { 
        name: 'Java', 
        icon: '☕', 
        starterCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`
    },
    { 
        name: 'Ruby', 
        icon: '💎', 
        starterCode: `puts 'Hello, World!'`
    },
    { 
        name: 'Go', 
        icon: '🐹', 
        starterCode: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`
    },
    { 
        name: 'Rust', 
        icon: '🦀', 
        starterCode: `fn main() {
    println!("Hello, World!");
}`
    },
    { 
        name: 'PHP', 
        icon: '🐘', 
        starterCode: `<?php
echo "Hello, World!";
?>`
    },
    { 
        name: 'Swift', 
        icon: '🕊️', 
        starterCode: `import Foundation

print("Hello, World!")`
    },
];
