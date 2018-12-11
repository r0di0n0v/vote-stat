const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');
const PromiseFtp = require('promise-ftp');

/**
 * URL w/ data
 */
const url = process.env.URL;

/**
 * FTP
 */
const FTP_HOST = process.env.FTP_HOST;
const FTP_PORT = process.env.FTP_PORT;
const FTP_USER = process.env.FTP_USER;
const FTP_PASS = process.env.FTP_PASS;
const FTP_DIR = process.env.FTP_DIR;

const ftp = new PromiseFtp();

/**
 * Data directory
 */
const DATA_DIR = `${__dirname}/data`;

const dt = new Date();
dt.setUTCHours(dt.getHours() + 5);
const timecode = getTimecode(dt);
console.log('Date', timecode);

let page = 1;
const MAX_PAGE = process.env.MAX_PAGE || 60;

const stat = {};

// todo: async/await for-loop OR yeild
loop()
    .then(() => {
        console.log('write stat.json');
        fs.writeFileSync(`${DATA_DIR}/stat${timecode}.json`, JSON.stringify(stat));
    })
    .then(renderHtmlPage)
    .then(putFilesToFtp);


/**
 * Main function
 */
async function loop() {
    return httpsGet(`${url}${page}`)
        .then(calcStat)
        .then((res) => {
            console.log('RES', res, page);
            if (res === true && page < MAX_PAGE) {
                page += 1;
                return loop();
            }
            return true;
        });
}

/**
 * Render simple html page w/ result
 * @returns {string[]}
 */
function renderHtmlPage() {
    console.log('render');
    /**
     * Рендер HTML
     */
    const arr = [];
    Object.keys(stat).forEach((key) => {
        arr.push(stat[key]);
    });
    arr.sort((a, b) => b.likes - a.likes);
    const category = {};

    // Таблица со статистикой
    let tbl = '';
    arr.forEach((data, i) => {
        const ico = 'ico_no';

        if (typeof category[data.cat] === 'undefined') {
            const catId = Object.keys(category).length;
            category[data.cat] = catId;
        }

        tbl += `
            <tr data-cat_id="${category[data.cat]}">
                <td>${i + 1}</td>
                <td><span class="${ico}"></span></td>
                <td>${data.cat}</td>
                <td>${data.name}</td>
                <td>${data.city}</td>
                <td>${data.likes}</td>
                <td><a href="${data.href}">${data.href}</a></td>
            </tr>
            `;
    });


    let filters = '<div class="btn" onclick="filterTable(-1)">Все</div>';
    /* eslint-disable */
    for (const cat in category) {
        filters += `<div class="btn" onclick="filterTable(${category[cat]})">${cat}</div>`;
    }
    /* eslint-enable */

    tbl = `
        <script src="main.js"></script>
        <link rel="stylesheet" type="text/css" href="style.css">
        <div>Обновлено: ${dt}</div>
        <br>
        <div id="filter_container">${filters}</div>
        <br>
        <table id="stat_tbl">${tbl}</table>`;

    const fileNameWTime = `table${timecode}`;
    const fileNameIndex = 'index';
    fs.writeFileSync(`${DATA_DIR}/${fileNameWTime}.html`, tbl);
    fs.writeFileSync(`${DATA_DIR}/${fileNameIndex}.html`, tbl);

    return [fileNameWTime, fileNameIndex];
}

/**
 * Put HTML page w/ results to hosting
 * @param fileNameArr
 * @returns {Promise<void>}
 */
async function putFilesToFtp(fileNameArr) {
    console.log('FTP...');
    await ftp.connect({
        host: FTP_HOST,
        port: FTP_PORT,
        user: FTP_USER,
        password: FTP_PASS,
    });
    console.log('FTP connected');
    /* eslint-disable */
    for (const fileName of fileNameArr) {
        console.log(`FTP ${fileName}  ${FTP_DIR}/${fileName}.html...`);
        await ftp.put(`${DATA_DIR}/${fileName}.html`, `${FTP_DIR}/${fileName}.html`);
    }
    /* eslint-enable */
    console.log('FTP end...');
    await ftp.end();
    console.log('FTP done!');
}

/**
 * Calc stat from one page
 */
function calcStat(data) {
    /**
     * Сбор статистики
     */
    const $ = cheerio.load(data);
    const tiles = $('.media-cell.hentry');
    for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const nameElem = $(tile).find('.media-cell-desc h3');

        const nameArr = nameElem.html().split('<br>');
        const name = decode(nameArr[0]);
        const city = decode(nameArr[1]);

        const cat = $(tile).find('.media-cell-desc .category').eq(0).text();
        const likes = parseInt($(tile).find('.media-cell-desc .category').eq(1).text(), 10);

        const href = $(tile).find('a').eq(0).attr('href');

        console.log(name, city, cat, likes, href);

        // End on duplicate
        if (!stat[href]) {
            stat[href] = {
                name,
                city,
                cat,
                likes,
                href,
                page,
            };
        } else {
            console.log('END page:', page, href);
            return false;
        }
    }
    return true;
}


/**
 * HTTPS GET promisifyed
 * @param {string} url
 */
function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => resolve(data));
        }).on('error', (err) => {
            reject(new Error(`Error: ${err.message}`));
        });
    });
}


/**
 * Decode HTML string to UTF8 string
 * ! copied fragment
 * @param {string} str
 */
function decode(str) {
    if (!str || !str.length) {
        return '';
    }
    return str.replace(/&(#?[\w\d]+);?/g, (s, e) => {
        let chr;
        const code = e.charAt(1) === 'x' ? parseInt(e.substr(2).toLowerCase(), 16) : parseInt(e.substr(1), 10);
        // eslint-disable-next-line
        if (!(isNaN(code) || code < -32768 || code > 65535)) {
            chr = String.fromCharCode(code);
        }
        return chr || s;
    });
}

/**
 * Get date string YYYYMMDD
 * @param dt
 * @returns {string}
 */
function getTimecode(dt) {
    const year = dt.getFullYear();
    const mon = dt.getMonth() + 1;
    const day = dt.getDate();
    const hh = dt.getHours();
    const mm = dt.getMinutes();

    return year
        + (`0${mon}`).substr(-2)
        + (`0${day}`).substr(-2)
        + (`0${hh}`).substr(-2)
        + (`0${mm}`).substr(-2);
}
