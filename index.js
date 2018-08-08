const AWS = require('aws-sdk');
const s3Zip = require('s3-zip');
const fs = require('fs');
const join = require('path').join;

exports.handler = function (event, context, callback) {

  const regex = /(?:\/\/s3\.amazonaws.com\/([^\/]+)|:\/\/([^.]+)\.s3\.amazonaws\.com)\/([^\/]+)/;
   const urlComponents = event.data[0].split(regex);
   const separateIndex = urlComponents[4].lastIndexOf('/');

  const region = 'us-east-1';
  const bucket = urlComponents[2] /*'testzipbucket'*/;
  const folder = urlComponents[3] + urlComponents[4].slice(0, separateIndex) + '/';
  const folderSplit = folder.split('/');
  console.log(folderSplit);
  /*const key = folder + zipFileName;*/
  let files = [];

  event.data.forEach(item => {
    const urlName = item.split('/');
    files.push(urlName[urlName.length - 1]);
  });

  try {

    const body = s3Zip.archive({ region: region, bucket: bucket}, folder, files);

    const zip = {
      bucket: 'fuseplm-attachments',
      folder: 'zip/',
      fileName: event.zipfilename
    };

    const zipParams = {
      params: {
        Bucket: zip.bucket,
        Key: zip.folder + zip.fileName,
        ACL: 'public-read'
      }
    };

    const zipFile = new AWS.S3(zipParams);

    zipFile
      .upload({
        Body: body
      })
      .on('httpUploadProgress', function (uploadProgress) {
        console.log('uploadProgress ', uploadProgress);
      })
      .send(function (uploadError, uploadSuccess) {
        if (uploadError) {
          console.log('zipFile.upload error ' + uploadError);
          callback(uploadError)
        }
        console.log(uploadSuccess);

        /*const params = {
          Bucket: 'testzipbucket',
          Key: 'questions/' + zipFileName,
          ACL: 'public-read'
        };*/

        const responseURL = 'https://s3-us-west-1.amazonaws.com/' + zip.bucket + '/' + zip.folder + zip.fileName;
        callback(null, responseURL);

        /*zipFile.putObject(params, (errorFile, data) => {
          if (errorFile) {
            console.log(errorFile);
            callback(errorFile);
          }
          console.log('****************DATA***********');
          console.log(data);

          /!*new AWS.S3().deleteObject(params, (errorDelete, successDelete) => {
            if (errorDelete) {
              console.log(errorDelete);
              callback(errorDelete);
            }
            console.log(successDelete);
            callback(null, data);
          });*!/
        });*/
      })
  } catch (catchedError) {
    console.log('Catched error: ' + catchedError);
    callback(catchedError);
  }
};