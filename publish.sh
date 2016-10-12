#!/bin/bash


if [ $? -eq 0 ]
then
	git add .
	git commit -m "更新模块"
	git log
	git push -u origin master
else
	echo "更新版本号失败！"
fi