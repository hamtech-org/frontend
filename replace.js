import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const targetDir = 'd:/GOCHOCTAPCUAHIN/TaiLieuNam4/HK2/Cong_Nghe_Moi/BAOCAO/frontend/src';
const files = walkDir(targetDir);

let count = 0;
// Premium Gold / Amber tones (soft, not blinding):
// #3B82F6 -> #EAB308 (Yellow 500 - softer)
// #2563EB -> #D97706 (Amber 600 - rich main color)
// #1D4ED8 -> #92400E (Amber 800 - dark accents)
const replaceMap = {
    '#3B82F6': '#EAB308', // Tailwind yellow-500
    '#3b82f6': '#eab308',
    '#2563EB': '#D97706', // Tailwind amber-600
    '#2563eb': '#d97706',
    '#1D4ED8': '#92400E', // Tailwind amber-800
    '#1d4ed8': '#92400e'
};

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    Object.keys(replaceMap).forEach(key => {
        if (content.includes(key)) {
            content = content.split(key).join(replaceMap[key]);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
});

console.log(`Replaced colors with premium golden amber in ${count} files.`);
