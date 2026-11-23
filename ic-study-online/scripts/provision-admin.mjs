import fs from 'node:fs';import path from 'node:path';import {randomBytes} from 'node:crypto';import {passwordHash} from '../dist/server/index.js';
const password=randomBytes(21).toString('base64url'),username='icadmin';
fs.writeFileSync(path.resolve('..','IC_Study_Admin_Access.txt'),`IC Study — tài khoản admin\n\nĐịa chỉ: https://ic-study-anime.lighthippo13.chatgpt.site\nUsername: ${username}\nMật khẩu ban đầu: ${password}\n\nĐăng nhập rồi dùng “Đổi mật khẩu” để đặt mật khẩu riêng. Không gửi file này cho học viên.\n`);
process.stdout.write(JSON.stringify({IC_ADMIN_USERNAME:username,IC_ADMIN_HASH:await passwordHash(password)}));
