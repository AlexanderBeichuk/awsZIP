var AWS = require('aws-sdk');
var s3Zip = require('s3-zip');

exports.handler = function (event, context) {
  console.log('event', event);

  const regex = /(?:\/\/s3\.amazonaws.com\/([^\/]+)|:\/\/([^.]+)\.s3\.amazonaws\.com)\/([^\/]+)/;
  const urlComponents = event.data[0].split(regex);
  const separateIndex = urlComponents[4].lastIndexOf('/');

  const region = 'us-west-1';
  const bucket = urlComponents[2];
  const folder = urlComponents[3] + urlComponents[4].slice(0, separateIndex);
  const zipFileName = 'partnumber-rev.zip';
  let files = [];

  event.data.forEach(item => {
    const urlName = item.split('/');
    files.push(urlName[urlName.length-1]);
  });

  try {

    const body = s3Zip.archive({ region: region, bucket: bucket}, folder, files);
    const zipParams = { params: { Bucket: bucket, Key: folder + zipFileName } };
    const zipFile = new AWS.S3(zipParams);
    console.log(zipFile);

    zipFile.upload({ Body: body })
      .on('httpUploadProgress', uploadEvent => {
        console.log(uploadEvent);
      })
      .send((uploadError, uploadResponse) => {
        if (uploadError) {
          context.fail(uploadError);
        }
        console.log(uploadResponse);
        context.succeed(uploadResponse);
      });

  } catch (zipError) {
    context.fail(zipError);
  }

  callback(null, zipFile);
};