import { spawn } from 'node:child_process'

const commands = [['node', ['server/index.js']], ['node', ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0']]]
const children = commands.map(([binary, args]) => spawn(binary, args, { stdio: 'inherit', shell: process.platform === 'win32' }))
for (const child of children) child.on('exit', () => children.forEach(other => { if (other !== child) other.kill() }))
