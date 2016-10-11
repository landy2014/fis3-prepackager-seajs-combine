var fs = require("fs"),
    path = require("path"),
    UglifyJS = require("uglify-js"),
    ObjProto = Object.prototype,
    ArrProto = Array.prototype,
    FunProto = Function.prototype;

module.exports = function(ret, conf, setting, opt) {

    // 默认参数
    var staticMap = setting.staticMap || {},
        moduleCache = [],
        staticMapPath = setting.staticMapPath || "./map/static-map.json",
        platPrefix = setting.platPrefix || "/p";

    var idArr = Object.keys(ret.ids),
        // regModule = /(?:app|active)(?:\/[^\/]+\/|\/)main\.js/i,
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
        // 把所有有模块依赖的文件都打包
        // if (regModule.test(currentValue) && curRequires.length > 0) {

        //     requireContents = getRequireContent(curRequires, currentValue);

        //     ret.ids[currentValue]._content = tempCurrentContent + " " + requireContents;
        // }

        // 页面样式处理
        if (regScss.test(currentValue)) {

            var scssFileName = ret.ids[currentValue].release.split("/").slice(-1),
                scssLastUri = ret.ids[currentValue].map.uri,
                scssUriLast = scssLastUri.split("/").slice(-1);

            staticMap[scssFileName] = scssUriLast.join("");
        }
        // 页面js
        if ((currentValue.indexOf("main.js") === -1) && (useModule.length > 0)) {
            var useFile = ret.ids[currentValue],
                releaseFileName = ret.ids[currentValue].map.uri.split("/").slice(-1);

            useFile._content = combineMap(ret, useModule) + useFile._content;

            /**
             * 临时处理，手动根据内容生成版本号，删除工具生成的版本号，待工具升级时，去除此部分代码。
             */
            var targetFile = path.resolve(opt.dest, (useFile.map.uri).replace(useFile.domain + "/", "")),
                targetRelease = useFile.release,
                hash = fis.util.md5(useFile._content),
                targetNewFile = path.resolve(opt.dest, targetRelease.replace(/^\//, "").replace(/\.js/, "") + "_" + hash + ".js"),
                targetContent = useFile._content;

            // 强制生成自己的版本号，删除工具原有的
            setTimeout(function() {
                if (fs.existsSync(targetFile)) {
                    fs.unlink(targetFile, function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            // console.log("删除" + targetFile + "成功...");
                            fs.writeFile(targetNewFile, targetContent, function(err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    // console.log("生成" + useFile.filename + "_" + hash + ".js" + "成功...");
                                }
                            });
                        }
                    });
                } else {
                    fs.writeFile(targetNewFile, targetContent, function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            // console.log("生成" + useFile.filename + "_" + hash + ".js" + "成功...");
                        }
                    });
                }
            }, 1000);

            // 存入map 表
            staticMap[useFile.filename + ".js"] = useFile.filename + "_" + hash + ".js";
        }
        // 活动页面css
        if (regActiveScss.test(currentValue)) {
            var scssFileName = ret.ids[currentValue].release.split("/").slice(-1),
                scssLastUri = ret.ids[currentValue].map.uri,
                scssUriLast = scssLastUri.split("/").slice(-1);

            staticMap[scssFileName] = scssUriLast.join("");

        }
        // js目录下除了页面js 的文件处理
        if (regPageJs.test(currentValue)) {
            var pageJsName = currentValue.split("/").slice(-1).join(""),
                pageJsRelaseName = ret.ids[currentValue].map.uri.split("/").slice(-1).join("");

            staticMap[pageJsName] = pageJsRelaseName;
        }
    });

    // console.log(moduleCache);

    // 手动生成模块js并删除已生成的模块
    setTimeout(function() {
        moduleCache.map(function(cItem) {
            if (fs.existsSync(cItem.oldPath)) {
                fs.unlink(cItem.oldPath, function(err) {
                    if (err && err.errno === -2) console.log("找不到文件...");
                    // console.log("删除" + cItem.oldPath + "成功...");
                });
            }

            fs.writeFile(cItem.newPath, cItem.newContent, function(err) {
                if (err) {
                    console.log(err);
                }

            });
        });
    }, 1000);


    // 写入map文件
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
    /**
     *  获取映射关系并压缩到对应文件
     *
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
                oldHash = tempUri.split("_")[1].replace(".js", ""),
                newHash = null,
                mContent = "",
                fileId = ret.ids[mItem].subpathNoExt;

                if(ret.ids[mItem].extras.moduleId) {
                    fileId = ret.ids[mItem].extras.moduleId
                } else {
                    fileId = ret.ids[mItem]
                }
            console.log(fileId);

            if (ret.ids[mItem].requires.length > 0) {
                mContent = getRequireContent(ret.ids[mItem].requires, mItem)
                newHash = fis.util.md5(mContent);
                moduleCache.push({
                    oldPath: path.resolve(opt.dest, ret.ids[mItem].release.replace(/^\//i, "")).replace(".js", "") + "_" + oldHash + ".js",
                    newPath: path.resolve(opt.dest, ret.ids[mItem].release.replace(/^\//i, "")).replace(".js", "") + "_" + newHash + ".js",
                    oldHash: oldHash,
                    newHash: newHash,
                    newContent: mContent
                });
            } else {
                newHash = oldHash;
            }

            if (index !== useModule.length - 1) {
                // usePreString += '["' + mItem + '","' + tempUri.replace(regUrl, "") + '"],';
                usePreString += '["' + fileId + '.js","' + fileId + "_" + newHash + ".js" + '"],';
            } else {
                // usePreString += '["' + mItem + '","' + tempUri.replace(regUrl, "") + '"]';
                usePreString += '["' + fileId + '.js","' + fileId + "_" + newHash + ".js" + '"]';
            }

        });
        tempUseContent = usePreString + useSufString;

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

                    var minifyContent = UglifyJS.minify(cFileContent, { fromString: true });

                    if (minifyContent.code) {
                        tempContent += "\n" + minifyContent.code;
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
