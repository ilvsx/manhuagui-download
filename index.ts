const LZString = require('./lzs.js');
import * as path from 'path';
import * as fs from 'fs';
import * as fss from 'fs-extra';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as PQueue from 'p-queue';

const sleep = (ms) => new Promise(reslove => setTimeout(reslove, ms))

const config = {
    comicID: 4172, //漫画ID，比如下载的地址是http://www.manhuagui.com/comic/26886/，则comicID为26886
    downloadDir: 'download', //下载文件夹
    concurrency: 5 // 并发数
}

interface CHAPTER {
    chapter: string
    title: string
    href: string
}

String.prototype['splic'] = function (f) {
    return LZString.decompressFromBase64(this).split(f)
}

const fetchByComicId = async (id) => {
    let url = `https://www.manhuagui.com/comic/${id}/`
    let headers = {
        'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.6,en;q=0.4',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Cookie': 'country=CN',
        'Host': 'www.manhuagui.com',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
    }
    let ret = await axios(url, { headers })
    // console.log(ret.data, ret.headers, ret.status)
    let data = ret.data

    let title = await getTitle(data)
    let chapterList = await getChapterList(data)

    // chapterList = [chapterList[0]]

    const queue = new PQueue({concurrency: config.concurrency})

    for (let chapter of chapterList) {
        let url = `https://www.manhuagui.com/${chapter.href}`
        // console.log(url)
        let ret = await axios(url, { headers })
        let data: string = ret.data
        let imgData = await getImgData(data)

        for(let file of imgData.files) {
            let urlPath = encodeURI(imgData.path) + `${file}?cid=${imgData.cid}&md5=${imgData.sl.md5}`

            let filePath = path.join(__dirname, config.downloadDir, title, chapter.chapter, chapter.title)
            let filePathName = path.join(filePath, file)
            if(!fs.existsSync(filePath)) {
                fss.mkdirpSync(filePath)
            }
            if(!fs.existsSync(filePathName)) {
                // console.log(urlPath, filePath, filePathName)
                // await sleep(config.timeout)
                queue.add(async() => {
                    try {
                        await downloadImage(urlPath, filePathName)
                    } catch(e) {
                        console.log(e)
                        await sleep(5000)
                    }
                })
            }
        }
    }
    queue.onIdle().then(() => {
		console.log('All work is done');
	});
}

const getChapterList = async (data: string): Promise<[CHAPTER]> => {
    const $ = cheerio.load(data)

    let chapters = []
    let chapterList: any = []

    $('.chapter h4').each((i, ele) => {
        // console.log($(ele).text())
        chapters.push($(ele).text())
    })

    $('.chapter-list ul').each((i, ele) => {
        let ulTag = $(ele)
        ulTag.find('a').each((ii, eleele) => {
            let aTag = $(eleele)
            let href = aTag.attr('href')
            let title = aTag.attr('title')
            // console.log(chapters[i], href, title)
            chapterList.push({
                chapter: chapters[i],
                title,
                href,
            })
        })
    })
    // console.log(chapterList)
    return chapterList
}

const getTitle = async (data: string): Promise<string> => {
    const $ = cheerio.load(data)
    let title = $('title').text().replace(' - 看漫画', '')
    return title
}

const getImgData = async(data: string): Promise<{files: [], path: string, cid: number, sl: {md5: string}}> => {
    let regexp = /x6c"](.+?)<\/script/im
    let match = regexp.exec(data)
    let d = eval(match[1])
    let imgData = JSON.parse(d.match(/\(({.+})\)/)[1])
    return imgData
}

const downloadImage = async (path, filePathName) => {
    // path = '/ps2/x/xw/03/seemh-103-ff25.png.webp?cid=39406&md5=SA8vmdS-kWK86NwSBu2TfA'
    // filePathName = `./download/seemh-103-ff25.png.webp`

    let url = `https://i.hamreus.com${path}`
    console.log(url)
    let headers = {
        'Accept': 'image/webp,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, sdch',
        'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.6,en;q=0.4',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Host': 'i.hamreus.com:8080',
        'Pragma': 'no-cache',
        'Referer': 'http://www.manhuagui.com/comic/5546/51102.html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
    }

    let response = await axios({
        method: "get",
        url,
        headers,
        responseType: "stream"
    })

    // console.log(response.headers, response.config)
    response.data.pipe(fs.createWriteStream(filePathName))
}

fetchByComicId(config.comicID)