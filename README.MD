# 使用方法

## 安装依赖

`npm install`

## 修改配置

修改 `index.ts` 文件中的 `config`

```
const config = {
    comicID: 4172, //漫画ID，比如下载的地址是http://www.manhuagui.com/comic/26886/，则comicID为26886
    downloadDir: 'download', //下载文件夹
    concurrency: 5 // 并发数。如果漫画在 200 页以上，建议设置为 1 ，防止被屏蔽
}
```

## 执行

`npm run start`

如果下载过程中报错，停止程序再执行即可，会从上次下载的地方继续下载