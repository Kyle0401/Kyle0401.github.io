(async function () {
    'use strict';

    const params = new URLSearchParams(location.search);
    const file = params.get('file') || '';
    const chapter = params.get('from') || '';
    const from = /^chapter-(?:[1-9]|10)$/.test(chapter) ? chapter : 'chapter-7';
    const title = document.getElementById('preview-title');
    const status = document.getElementById('preview-status');
    const body = document.getElementById('preview-body');
    const download = document.getElementById('preview-download');
    const kinds = new Map([
        ['bin', 'bytes'], ['fst', 'wave'], ['zip', 'archive'], ['png', 'image'],
        ...['cpp', 'h', 'json', 'lock', 'patch', 'py', 'sh', 'sha256', 'sv', 'txt', 'v'].map(ext => [ext, 'text']),
    ]);
    const validPath = /^assets\/(?:[A-Za-z0-9][A-Za-z0-9_.-]*\/)*[A-Za-z0-9][A-Za-z0-9_.-]*$/;
    const labArchive = 'assets/practice/functional-verification-labs.zip';

    document.getElementById('preview-back').href = './#' + from;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    let theme = preferred;
    try { theme = localStorage.getItem('paper-note-theme') || preferred; } catch {}
    document.documentElement.dataset.theme = theme;

    function fileKind(path) {
        return validPath.test(path) && kinds.get(path.split('.').at(-1).toLowerCase());
    }

    async function get(path) {
        const response = await fetch('./' + path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
    }

    function showText(text, label) {
        const view = document.createElement('pre');
        view.tabIndex = 0;
        view.setAttribute('aria-label', label);
        view.textContent = text;
        body.append(view);
    }

    function showTable(headers, rows) {
        const scroll = document.createElement('div');
        scroll.className = 'table-scroll';
        scroll.tabIndex = 0;
        scroll.setAttribute('aria-label', '预览表格');
        const table = document.createElement('table');
        const headerRow = table.createTHead().insertRow();
        for (const header of headers) {
            const cell = document.createElement('th');
            cell.scope = 'col';
            cell.textContent = header;
            headerRow.append(cell);
        }
        const tbody = table.createTBody();
        for (const values of rows) {
            const row = tbody.insertRow();
            for (const value of values) {
                const cell = row.insertCell();
                if (value instanceof HTMLElement) cell.append(value);
                else cell.textContent = value;
                if (typeof value === 'number') cell.className = 'file-size';
            }
        }
        scroll.append(table);
        body.append(scroll);
    }

    function hexDump(bytes) {
        const lines = [];
        for (let index = 0; index < bytes.length; index += 16) {
            const values = [...bytes.subarray(index, index + 16)];
            const address = index.toString(16).padStart(8, '0');
            const hex = values.map(byte => byte.toString(16).padStart(2, '0')).join(' ').padEnd(47, ' ');
            const ascii = values.map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.').join('');
            lines.push(`${address}  ${hex}  ${ascii}`);
        }
        return lines.join('\n');
    }

    function readArchive(buffer) {
        const view = new DataView(buffer);
        const length = view.byteLength;
        let end = length - 22;
        while (end >= Math.max(0, length - 65557)) {
            if (view.getUint32(end, true) === 0x06054b50 && end + 22 + view.getUint16(end + 20, true) === length) break;
            end -= 1;
        }
        if (end < Math.max(0, length - 65557)) throw new Error('ZIP directory not found');
        const count = view.getUint16(end + 10, true);
        const directoryEnd = view.getUint32(end + 16, true) + view.getUint32(end + 12, true);
        let offset = view.getUint32(end + 16, true);
        if (directoryEnd > end) throw new Error('ZIP directory is outside the file');
        const decoder = new TextDecoder();
        const entries = [];
        for (let index = 0; index < count; index += 1) {
            if (offset + 46 > directoryEnd || view.getUint32(offset, true) !== 0x02014b50) {
                throw new Error('Invalid ZIP entry');
            }
            const nameLength = view.getUint16(offset + 28, true);
            const nameStart = offset + 46;
            const next = nameStart + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
            if (next > directoryEnd) throw new Error('ZIP entry is outside the directory');
            const name = decoder.decode(new Uint8Array(buffer, nameStart, nameLength));
            entries.push({ name, size: view.getUint32(offset + 24, true) });
            offset = next;
        }
        if (offset !== directoryEnd) throw new Error('ZIP directory size does not match');
        return entries;
    }

    function archiveName(name) {
        const member = 'assets/practice/' + name;
        if (file !== labArchive || !fileKind(member)) return name;
        const link = document.createElement('a');
        link.href = './preview.html?' + new URLSearchParams({ file: member, from });
        link.textContent = name;
        return link;
    }

    const kind = fileKind(file);
    if (!kind) {
        status.textContent = '这个链接没有指定可预览的实验文件。';
        return;
    }

    const name = file.split('/').at(-1);
    title.textContent = name;
    document.title = `${name} · 实验文件预览`;
    try {
        if (kind === 'wave') {
            const waveform = await (await get(file.replace(/\.fst$/i, '.preview.json'))).json();
            status.textContent = `${waveform.title} · 时间单位 ${waveform.timescale} · 时间戳 ${waveform.range.join('–')}`;
            showTable(waveform.columns, waveform.rows);
            const note = document.createElement('p');
            note.textContent = waveform.note;
            body.append(note);
        } else if (kind === 'image') {
            const image = new Image();
            image.src = './' + file;
            image.alt = name;
            await image.decode();
            body.append(image);
            status.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
        } else {
            const response = await get(file);
            if (kind === 'archive') {
                const entries = readArchive(await response.arrayBuffer());
                status.textContent = `${entries.length} 个文件`;
                showTable(['文件', '解压后大小（字节）'], entries.map(entry => [archiveName(entry.name), entry.size]));
            } else if (kind === 'bytes') {
                const bytes = new Uint8Array(await response.arrayBuffer());
                status.textContent = `${bytes.length} 字节 · 十六进制`;
                showText(hexDump(bytes), '十六进制内容');
            } else {
                const text = await response.text();
                status.textContent = '文本预览';
                showText(text, '文件内容');
            }
        }
        download.href = './' + file;
        download.hidden = false;
    } catch (error) {
        status.textContent = `无法预览这个文件。请刷新页面重试。${/^HTTP \d+$/.test(error.message) ? `（${error.message}）` : ''}`;
    }
})();
