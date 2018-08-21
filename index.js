const AWS = require('aws-sdk');
const s3Zip = require('s3-zip');
const fs = require('fs');
const join = require('path').join;

exports.handler = function (event, context, callback) {

  const regex = /(?:\/\/s3\.amazonaws.com\/([^\/]+)|:\/\/([^.]+)\.s3\.amazonaws\.com)\/([^\/]+)/;
  const urlComponents = event.data[0].split(regex);
  const separateIndex = urlComponents[4].lastIndexOf('/');

  const region = 'us-east-1';
  const bucket = urlComponents[2];
  const folder = urlComponents[3] + urlComponents[4].slice(0, separateIndex) + '/';
  let files = [];

  event.data.forEach(item => {
    const urlName = item.split('/');
    files.push(urlName[urlName.length - 1]);
  });

  try {

    const body = s3Zip.archive({region: region, bucket: bucket}, folder, files);

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
        console.log(`uploadProgress ${uploadProgress}`);
      })
      .send(function (uploadError, uploadSuccess) {
        if (uploadError) {
          console.log(`zipFile.upload error ${uploadError}`);
          callback(uploadError);
        }
        console.log(uploadSuccess);
        new AWS.S3().headObject({
          Bucket: zip.bucket,
          Key: zip.folder + zip.fileName
        }, function (errorFileInfo, headObjectData) {
          if (errorFileInfo) {
            console.log(errorFileInfo);
            callback(errorFileInfo);
          }
          const fileSize = bytesToSize(headObjectData.ContentLength);
          if ((fileSize.amount > 500 && fileSize.unitIndex === 2) || fileSize.unitIndex > 2) {
            console.log(`Limit exceeded: ${fileSize.amount} ${fileSize.unit}`);
            callback({
              message: `Limit exceeded`,
              size: `${fileSize.amount} ${fileSize.unit}`
            });
          }
          const responseURL = `https://s3-us-west-1.amazonaws.com/${zip.bucket}/${zip.folder + zip.fileName}`;
          callback(null, responseURL);
        })
      })
  } catch (catchedError) {
    console.log(`Catched error: ${catchedError}`);
    callback(catchedError);
  }
};

function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) {
    return {
      amount: 0,
      unitIndex: 0,
      unit: sizes[0]
    };
  }
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return {
    amount: Math.round(bytes / Math.pow(1024, i), 2),
    unitIndex: i,
    unit: sizes[i]
  }
};