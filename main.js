const http = require('http');
const fs = require('fs');
const { program } = require('commander');

// 1. Налаштування параметрів командного рядка
program
  .option('-H, --host <host>', 'server host')
  .option('-p, --port <port>', 'server port');

program.parse(process.argv);
const options = program.opts();

// Перевірка обов'язкових параметрів
if (!options.host) {
    console.error("Please, specify server host");
    process.exit(1);
}
if (!options.port) {
    console.error("Please, specify server port");
    process.exit(1);
}

// 2. Асинхронне читання файлу
fs.readFile('bank_managers.json', 'utf8', (err, data) => {
    if (err) {
        console.error("Помилка читання файлу:", err);
        return;
    }
    
    const parsedData = JSON.parse(data);

    // 3. Створення HTTP сервера
    const server = http.createServer((req, res) => {
        // Парсимо URL, щоб отримати шлях та параметри
        const reqUrl = new URL(req.url, `http://${options.host}:${options.port}`);

        // Маршрут / (віддає весь JSON)
        if (reqUrl.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(data); 
        } 
        // Маршрут /filtered (фільтрує і віддає XML)
        else if (reqUrl.pathname === '/filtered') {
            const showMfo = reqUrl.searchParams.get('mfo') === 'true';
            const statusNormal = reqUrl.searchParams.get('status_normal') === 'true';

            let filteredData = parsedData;

            // Фільтрація: тільки нормальні банки (код 1)
            if (statusNormal) {
                filteredData = filteredData.filter(bank => bank.COD_STATE === 1);
            }

            // Формування XML відповіді
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<banks>\n';
            filteredData.forEach(bank => {
                xml += '  <bank>\n';
                if (showMfo) {
                    xml += `    <mfo>${bank.MFO}</mfo>\n`;
                }
                xml += `    <name>${bank.SHORTNAME}</name>\n`;
                xml += '  </bank>\n';
            });
            xml += '</banks>';

            res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
            res.end(xml);
        } 
        // Якщо ввели неіснуючу адресу
        else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    });

    // 4. Запуск сервера
    server.listen(options.port, options.host, () => {
        console.log(`Сервер успішно запущено: http://${options.host}:${options.port}/`);
    });
});