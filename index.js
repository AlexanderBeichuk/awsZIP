var AWS = require('aws-sdk');
var s3Zip = require('s3-zip');
var fs = require('fs');
var join = require('path').join;

exports.handler = function (event, context) {
    console.log('event', event);

    const regex = /(?:\/\/s3\.amazonaws.com\/([^\/]+)|:\/\/([^.]+)\.s3\.amazonaws\.com)\/([^\/]+)/;
    const urlComponents = event.data[0].split(regex);
    const separateIndex = urlComponents[4].lastIndexOf('/');

    const region = 'us-west-1';
    const bucket = urlComponents[2];
    const folder = urlComponents[3] + urlComponents[4].slice(0, separateIndex) + '/';
    const zipFileName = 'partnumber-rev.zip';
    let files = [];


    event.data.forEach(item => {
        const urlName = item.split('/');
        files.push(urlName[urlName.length - 1]);
    });

    console.log('------------------------------------------------------');
    console.log(bucket);
    console.log(folder);
    console.log(files);
    console.log('------------------------------------------------------');

    console.log('**********1***********');
    const output = fs.createWriteStream(join(__dirname, zipFileName));

    s3Zip
        .archive({region: region, bucket: bucket}, folder, files)
        .pipe(output)
        .pipe(function () {
            console.log('**********2***********');
            callback(null, console.log(output));
            console.log('**********2***********');
        });
    //callback(null, body);
    console.log('**********END***********');
}