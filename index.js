var AWS = require('aws-sdk');
var s3Zip = require('s3-zip');
var fs = require('fs');
var join = require('path').join;

exports.handler = function (event, context, callback) {
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

  const output = fs.createWriteStream(join('/tmp', zipFileName));
  s3Zip
    .archive({region: region, bucket: bucket}, folder, files)
    .pipe(output);

  output
    .on('finish', () => {
      output.close(() => {
        fs.readFile('/tmp/partnumber-rev.zip', 'utf8', (readFileError, contents) => {
          if (readFileError) {
            callback(readFileError);
          }
          const params = {Bucket: 'testzipbucket', Key: zipFileName, Body: contents };
          new AWS.S3().putObject(params, function(uploadError, data) {
            if (uploadError) {
              console.log('**************************UPLOAD ERROR*************************');
              console.log(uploadError);
              callback(uploadError);
            }
            console.log("Successfully uploaded data to myBucket/myKey");
            callback(null, contents);
          });
        });
      })
    })
    .on('error', (outputError) => {
      callback(outputError);
  });
};