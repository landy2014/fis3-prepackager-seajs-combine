# 基于fis3的seajs 模块打包工具

本工具支持按页面打包，自动将页面所有依赖压缩成为一个文档，并生成对应的静态资源表，本工具仅限于使用在金海马商城前端工具中，不一定适用于所有项目，敬请注意！

## 安装
````
npm install fis3-prepackager-seajs-combine --save-dev

or 

npm install fis3-prepackager-seajs-combine -g

````

## 使用
````
//fis-conf.js
fis.match("::package",{
	prepackager : fis.plugin("seajs-combine",{
		platPrefix : "/p",  // 目录前缀，默认为 "/p"
		staticMap  : {} ,   // 静态资源对象，默认为{}，不推荐修改
		staticMapPath : "./map/static-map.json" // 静态资源表保存位置，默认为 "./map/static-map.json"
	});
});
````