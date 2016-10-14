var fs = require("fs"),
    path = require("path"),
    UglifyJS = require("uglify-js");

module.exports = function(ret, conf, setting, opt) {
    console.log(setting);

    // 默认参数
    var staticMap = setting.staticMap || {},
        moduleCache = [],
        staticMapPath = setting.staticMapPath || "./map/static-map.json",
        platPrefix = setting.platPrefix || "/p",
        useHash = setting.combine || false; // 合并后是否加版本号

    var idArr = Object.keys(ret.ids),
        regModule = /main\.js/i,
        regScss = /app\/[^\/]+\/[^\/]+\.scss/i,
        regJs = /app\/[^\/]+\/.*\.js/i,
        regActiveScss = /active\/[^\/]+[\/|\w+].*\.scss+/i,
        regPageJs = /js\/[^\/]+\.js/i;

    // 处理文件
    idArr.map(function(currentValue, index) {
        // 是否有依赖
        var curRequires = ret.ids[currentValue].requires,
            // 有seajs.use 
            useModule = ret.ids[currentValue].asyncs,
            requireContents = "",
            tempCurrentContent = ret.ids[currentValue]._content ? ret.ids[currentValue]._content : "";
        // 页面样式处理
        if (regScss.test(currentValue)) {

            var scssFileName = ret.ids[currentValue].release.split("/").slice(-1),
                scssLastUri = ret.ids[currentValue].map.uri,
                scssUriLast = scssLastUri.split("/").slice(-1);

            if (useHash) {
                // 存入map表
                staticMap[scssFileName] = scssUriLast.join("");
            }
        }
        // 页面js
        if ((currentValue.indexOf("main.js") === -1) && (useModule.length > 0)) {
            var useFile = ret.ids[currentValue],
                releaseFileName = ret.ids[currentValue].map.uri.split("/").slice(-1);

                useFile._content = combineMap(ret, useModule) + useFile._content

                /**
                 * 临时处理，手动根据内容生成版本号，删除工具生成的版本号，待工具升级时，去除此部分代码。
                 */
                var targetFile = path.resolve(opt.dest, (useFile.map.uri).replace(useFile.domain + "/", "")),
                    targetRelease = useFile.release,
                    hash = fis.util.md5(useFile._content),
                    targetNewFile = useHash ? path.resolve(opt.dest, targetRelease.replace(/^\//, "").replace(/\.js/, "") + "_" + hash + ".js") : path.resolve(opt.dest, targetRelease.replace(/^\//, "").replace(/\.js/, "") + ".js"),
                    targetContent = useFile._content;

                // 强制生成自己的版本号，删除工具原有的
                setTimeout(function() {
                    if (fs.existsSync(targetFile)) {
                        fs.unlink(targetFile, function(err) {
                            if (err) {
                                console.log(err);
                            } else {
                                fs.writeFile(targetNewFile, targetContent, function(err) {
                                    if (err) {
                                        console.log(err);
                                    }
                                });
                            }
                        });
                    } else {
                        fs.writeFile(targetNewFile, targetContent, function(err) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    }
                }, 1000);

            if (useHash) {
                // 存入map 表
                staticMap[useFile.filename + ".js"] = useFile.filename + "_" + hash + ".js";
            }

            
        }
        // 活动页面css
        if (regActiveScss.test(currentValue)) {
            var scssFileName = ret.ids[currentValue].release.split("/").slice(-1),
                scssLastUri = ret.ids[currentValue].map.uri,
                scssUriLast = scssLastUri.split("/").slice(-1);

            if (useHash){
                staticMap[scssFileName] = scssUriLast.join("");
            }

        }
        // js目录下除了页面js 的文件处理
        if (regPageJs.test(currentValue)) {
            var pageJsName = currentValue.split("/").slice(-1).join(""),
                pageJsRelaseName = ret.ids[currentValue].map.uri.split("/").slice(-1).join("");

            if (useHash){
                staticMap[pageJsName] = pageJsRelaseName;
            }
        }
    });

    // 手动生成模块js并删除已生成的模块
    setTimeout(function() {
        moduleCache.map(function(cItem) {
            if (fs.existsSync(cItem.oldPath)) {
                fs.unlink(cItem.oldPath, function(err) {
                    if (err && err.errno === -2) console.log("找不到文件...");
                });
            }

            fs.writeFile(cItem.newPath, cItem.newContent, function(err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("生成：" + cItem.newPath + "成功！\n")
                }

            });
        });
    }, 1000);


    // 写入map文件
    if (useHash) {
        
        var tempMap = JSON.stringify(staticMap, null, 4);

        if (fs.existsSync(staticMapPath)) {
            fs.writeFile(staticMapPath, tempMap, function(err) {
                if (err) {
                    throw err;
                    return;
                }
                console.log("\n写入map表成功！");
            });
        } else {
            fs.appendFile(staticMapPath, tempMap, function(err) {
                if (err) {
                    throw err;
                    return;
                }
                console.log("\n写入map表成功！");
            });
        }
    }
    
    /**
     *  获取映射关系并压缩到对应文件
     *
     */
    function combineMap(ret, useModule) {
        var tempUseContent = "",
            usePreString = 'seajs.config({ map:[',
            useSufString = ']});';

        // 处理 seajs.use
        useModule.map(function(mItem, index) {

            var tempUri = ret.ids[mItem].map.uri,
                regUrl = ret.ids[mItem].domain + platPrefix + "/lib/",
                oldHash = useHash ? tempUri.split("_")[1].replace(".js", "") : "",
                newHash = null,
                mContent = "",
                newPath = "",
                fileId = ret.ids[mItem].subpathNoExt;

                if(ret.ids[mItem].extras.moduleId) {
                    fileId = ret.ids[mItem].extras.moduleId
                } else {
                    fileId = ret.ids[mItem]
                }

            if (ret.ids[mItem].requires.length > 0) {
                mContent = getRequireContent(ret.ids[mItem].requires, mItem)
                newHash = fis.util.md5(mContent);
                newPath = useHash ? path.resolve(opt.dest, ret.ids[mItem].release.replace(/^\//i, "")).replace(".js", "") + "_" + newHash + ".js" : path.resolve(opt.dest, ret.ids[mItem].release.replace(/^\//i, "")).replace(".js", "") + ".js";
                moduleCache.push({
                    oldPath: path.resolve(opt.dest, ret.ids[mItem].release.replace(/^\//i, "")).replace(".js", "") + "_" + oldHash + ".js",
                    newPath: newPath,
                    oldHash: oldHash,
                    newHash: newHash,
                    newContent: mContent
                });
            } else {
                newHash = oldHash;
            }

            
            if (index !== useModule.length - 1) {
                usePreString += '["' + fileId + '.js","' + fileId + "_" + newHash + ".js" + '"],';
            } else {
                usePreString += '["' + fileId + '.js","' + fileId + "_" + newHash + ".js" + '"]';
            }
        });
        tempUseContent = useHash ? usePreString + useSufString : "";

        //返回合并后内容
        return tempUseContent;
    }
    /**
     * 获取依赖模块内容并合并和压缩为一个文件
     * 
     * @param  {Array} requireList 依赖列表
     * @return {String}            压缩后的内容
     */
    function getRequireContent(requireList, currentItem) {
        var tempContent = ret.ids[currentItem]._content;

        if (requireList.length > 0) {
            !(function() {
                var self = this;
                requireList.map(function(item) {

                    if (ret.ids[item] && ret.ids[item].requires.length > 0) {

                        arguments.callee(ret.ids[item].requires);
                    }

                    var cFileContent = !!ret.ids[item] ? ret.ids[item]._content : "";
                    
                    var minifyContent = useHash ? (UglifyJS.minify(cFileContent, { fromString: true })).code : cFileContent;

                    if (minifyContent) {
                        tempContent += "\n" + minifyContent;
                    }
                });
            }());
        }


        return tempContent;
    }
    /**
     *  格式化时间 
     */
    function formatTime() {
        var objDate = new Date(),
            fullYear = objDate.getFullYear(),
            month = objDate.getMonth() < 10 ? "0" + objDate.getMonth() : objDate.getMonth(),
            days = objDate.getDate() < 10 ? "0" + objDate.getDate() : objDate.getDate(),
            hour = objDate.getHours() < 10 ? "0" + objDate.getHours() : objDate.getHours(),
            minutes = objDate.getMinutes() < 10 ? "0" + objDate.getMinutes() : objDate.getMinutes(),
            seconds = objDate.getSeconds() < 10 ? "0" + objDate.getSeconds() : objDate.getSeconds(),
            preStr = '\n/* build by khf v1.0.0: ',
            sufStr = ' */\n';

        return preStr + fullYear + "-" + month + "-" + days + " " + hour + ":" + minutes + ":" + seconds + sufStr;

    }
}
