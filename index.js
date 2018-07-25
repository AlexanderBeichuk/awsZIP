const AWS = require('aws-sdk');
const s3Zip = require('s3-zip');
const fs = require('fs');
const join = require('path').join;

exports.handler = function (event, context, callback) {

  /*const regex = /(?:\/\/s3\.amazonaws.com\/([^\/]+)|:\/\/([^.]+)\.s3\.amazonaws\.com)\/([^\/]+)/;
   const urlComponents = event.data[0].split(regex);
   const separateIndex = urlComponents[4].lastIndexOf('/');*/

  const region = 'us-west-1';
  const bucket = /*urlComponents[2]*/ 'testzipbucket';
  const folder = /*urlComponents[3] + urlComponents[4].slice(0, separateIndex) +*/ 'questions' + '/';
  const zipFileName = 'partnumber-rev.zip';
  let files = [];

  event.data.forEach(item => {
    const urlName = item.split('/');
    files.push(urlName[urlName.length - 1]);
  });
  /*const output = fs.createWriteStream(join('/tmp', zipFileName));
   s3Zip
   .archive({region: region, bucket: bucket}, folder, files)
   .pipe(output);
   output
   .on('finish', () => {
   fs.readFile('/tmp/' + zipFileName, 'utf8', (readFileError, contents) => {
   if (readFileError) {
   callback(readFileError);
   }
   callback(null, contents);
   })
   })*/

  try {

    const body = s3Zip.archive({ region: region, bucket: bucket}, folder, files);
    const zipParams = {params: {Bucket: bucket, Key: folder + zipFileName}};
    const zipFile = new AWS.S3(zipParams);

    zipFile.upload({Body: body})
      .on('httpUploadProgress', function (uploadProgress) {
        console.log('uploadProgress ', uploadProgress);
      })
      .send(function (uploadError, uploadSuccess) {
        if (uploadError) {
          console.log('zipFile.upload error ' + uploadError);
          callback(uploadError)
        }
        console.log(uploadSuccess);
        const params = {Bucket: bucket, Key: 'questions/partnumber-rev.zip'};

        new AWS.S3().getObject(params, (errorFile, data) => {
          if (errorFile) {
            console.log(errorFile);
            callback(errorFile);
          }
          console.log(data);

          new AWS.S3().deleteObject(params, (errorDelete, successDelete) => {
            if (errorDelete) {
              console.log(errorDelete);
              callback(errorDelete);
            }
            console.log(successDelete);
            callback(null, data);
          });
        });
      })
  } catch (catchedError) {
    console.log('Catched error: ' + catchedError);
    callback(catchedError);
  }
};

  /*const output = fs.createWriteStream(join('/tmp', zipFileName));
   s3Zip
   .archive({region: region, bucket: bucket}, folder, files)
   .pipe(output);

   output
   .on('finish', (a,b,c) => {
   /!*console.log('************LOGS*************');
   console.log(a);
   console.log(b);
   console.log(c);*!/
   output.close((d,e,f) => {
   /!*console.log(d);
   console.log(e);
   console.log(f);
   console.log('************LOGS*************');*!/
   fs.readFile('/tmp/' + zipFileName, 'utf8', (readFileError, contents) => {
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
   });*/